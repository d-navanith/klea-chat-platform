import { io, Socket } from 'socket.io-client';
import { useStore, type Message, type Chat } from '../store/useStore';
import {
  decryptSecretMessage,
  generateECDHKeyPair,
  importPublicKey,
  deriveSharedAESKey,
  computeVisualFingerprint,
} from './crypto';

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  } catch (e) {
    // AudioContext permission
  }
};

let socket: Socket | null = null;
// In-memory keypair storage for active sessions
const localKeyPairs: { [chatId: string]: CryptoKeyPair } = {};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Cleanly disconnected on logout');
  }
  if (typeof window !== 'undefined') {
    (window as any).__klea_socket = null;
  }
};

export const initSocket = (token: string) => {
  if (socket) {
    socket.disconnect();
  }

  const socketUrl =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5001'
      : '/';

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  if (typeof window !== 'undefined') {
    (window as any).__klea_socket = socket;
  }

  socket.on('connect', () => {
    console.log('[Socket] Connected to Klea real-time gateway');
    const activeChatId = useStore.getState().activeChatId;
    if (activeChatId) {
      socket?.emit('join_chat', activeChatId);
    }
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Gateway connection error:', err.message);
  });

  // Handle incoming message
  socket.on('new_message', async ({ message }: { message: Message }) => {
    const store = useStore.getState();

    // If it's an E2EE Secret Chat message with ciphertext, decrypt it
    if (message.ciphertext && message.iv) {
      const secretKey = store.secretKeys[message.chatId];
      if (secretKey) {
        message.decryptedContent = await decryptSecretMessage(
          message.ciphertext,
          message.iv,
          secretKey
        );
      } else {
        message.decryptedContent = '🔒 [Encrypted Secret Message]';
      }
    }

    store.addMessage(message);

    // Play chime & manage unread status if message received from someone else
    if (message.senderId !== store.user?.id) {
      playNotificationSound();

      if (store.activeChatId === message.chatId) {
        socket?.emit('mark_as_read', { chatId: message.chatId });
      } else {
        const targetChat = store.chats.find((c) => c.id === message.chatId);
        if (targetChat) {
          store.updateChat(message.chatId, {
            unreadCount: (targetChat.unreadCount || 0) + 1,
          });
        }
      }
    }
  });

  // Handle chat update (latest message in sidebar)
  socket.on('chat_updated', ({ chatId, chat, lastMessage }: { chatId: string; chat?: Chat; lastMessage: Message | null }) => {
    const store = useStore.getState();
    const existing = store.chats.find((c) => c.id === chatId);
    if (!existing && chat) {
      store.addChat(chat);
    } else {
      store.updateChat(chatId, {
        messages: lastMessage ? [lastMessage] : [],
        updatedAt: new Date().toISOString(),
      });
    }
  });

  // Handle new chat created by another user
  socket.on('new_chat', ({ chat }: { chat: Chat }) => {
    useStore.getState().addChat(chat);
  });

  // Handle deleted message
  socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
    useStore.getState().deleteMessage(messageId);
  });

  // Handle edited message
  socket.on('message_edited', ({ message }: { message: Message }) => {
    useStore.getState().editMessage(message);
  });

  // Handle cleared chat
  socket.on('chat_cleared', ({ chatId }: { chatId: string }) => {
    useStore.getState().clearChat(chatId);
  });

  // Handle messages read receipts
  socket.on('messages_read', ({ chatId }: { chatId: string }) => {
    useStore.getState().markChatAsRead(chatId);
  });

  // Handle typing status
  socket.on('user_typing', ({ chatId, username, isTyping }: { chatId: string; username: string; isTyping: boolean }) => {
    useStore.getState().setTyping(chatId, username, isTyping);
  });

  // Handle presence updates
  socket.on('user_status', ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen: string }) => {
    useStore.getState().setUserStatus(userId, isOnline, lastSeen);
  });

  // Handle reactions
  socket.on('reactions_updated', ({ messageId, reactions }) => {
    useStore.getState().updateMessageReactions(messageId, reactions);
  });

  // Handle message pin update
  socket.on('message_pin_updated', ({ messageId, isPinned, message }: { messageId: string; chatId: string; isPinned: boolean; message: Message }) => {
    if (message) {
      useStore.getState().editMessage(message);
    } else {
      const state = useStore.getState();
      const target = state.messages.find((m) => m.id === messageId);
      if (target) {
        useStore.getState().editMessage({ ...target, isPinned });
      }
    }
  });

  // Handle E2EE Key Offer (Secret chat initiator sent public key)
  socket.on('e2ee_key_offer', async ({ chatId, initiatorUserId, initiatorPubkey }) => {
    console.log('[Crypto] Received E2EE Key Offer for chat:', chatId);
    try {
      // 1. Generate receiver ECDH keypair
      const { keyPair, publicKeyBase64 } = await generateECDHKeyPair();
      localKeyPairs[chatId] = keyPair;

      // 2. Import initiator's public key
      const importedInitiatorKey = await importPublicKey(initiatorPubkey);

      // 3. Derive shared AES-256-GCM key
      const sharedKey = await deriveSharedAESKey(keyPair.privateKey, importedInitiatorKey);

      // 4. Compute Telegram visual emoji fingerprint
      const fingerprint = await computeVisualFingerprint(sharedKey);
      useStore.getState().setSecretKey(chatId, sharedKey, fingerprint);

      // 5. Send back receiver public key
      socket?.emit('e2ee_key_answer', {
        chatId,
        targetUserId: initiatorUserId,
        receiverPubkey: publicKeyBase64,
      });

      // Save to server database as well
      await fetch(`/api/chats/${chatId}/e2ee-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverPubkey: publicKeyBase64 }),
      });
    } catch (err) {
      console.error('[Crypto] Error handling E2EE key offer:', err);
    }
  });

  // Handle E2EE Key Answer (Receiver responded with their public key)
  socket.on('e2ee_key_answer', async ({ chatId, receiverPubkey }) => {
    console.log('[Crypto] Received E2EE Key Answer for chat:', chatId);
    try {
      const myKeyPair = localKeyPairs[chatId];
      if (!myKeyPair) {
        console.warn('No local keypair found for secret chat:', chatId);
        return;
      }

      const importedReceiverKey = await importPublicKey(receiverPubkey);
      const sharedKey = await deriveSharedAESKey(myKeyPair.privateKey, importedReceiverKey);
      const fingerprint = await computeVisualFingerprint(sharedKey);

      useStore.getState().setSecretKey(chatId, sharedKey, fingerprint);
      console.log('[Crypto] Secret chat key agreement finalized! Fingerprint:', fingerprint.emojis);
    } catch (err) {
      console.error('[Crypto] Error finalizing E2EE key agreement:', err);
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const joinChatRoom = (chatId: string) => {
  socket?.emit('join_chat', chatId);
};

export const leaveChatRoom = (chatId: string) => {
  socket?.emit('leave_chat', chatId);
};

export const emitTyping = (chatId: string, isTyping: boolean) => {
  socket?.emit(isTyping ? 'typing_start' : 'typing_stop', { chatId });
};

export const emitReaction = (chatId: string, messageId: string, emoji: string) => {
  socket?.emit('toggle_reaction', { chatId, messageId, emoji });
};

export const emitDeleteMessage = (chatId: string, messageId: string) => {
  socket?.emit('delete_message', { chatId, messageId });
};

export const emitEditMessage = (chatId: string, messageId: string, content: string) => {
  socket?.emit('edit_message', { chatId, messageId, content });
};

export const emitClearChat = (chatId: string) => {
  socket?.emit('clear_chat', { chatId });
};

export const emitForwardMessage = (messageId: string, targetChatIds: string[]) => {
  socket?.emit('forward_message', { messageId, targetChatIds });
};

export const emitMarkAsRead = (chatId: string) => {
  socket?.emit('mark_as_read', { chatId });
};

export const emitTogglePin = (chatId: string, messageId: string) => {
  socket?.emit('toggle_pin_message', { chatId, messageId });
};

export const storeLocalKeyPair = (chatId: string, keyPair: CryptoKeyPair) => {
  localKeyPairs[chatId] = keyPair;
};
