import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role?: 'ADMIN' | 'EMPLOYEE';
  isApproved?: boolean;
  isOnline: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface Attachment {
  id?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface Reaction {
  id?: string;
  messageId: string;
  userId: string;
  emoji: string;
  user?: {
    id: string;
    username: string;
    displayName: string;
  };
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  replyToId?: string;
  content?: string;
  ciphertext?: string;
  iv?: string;
  ttlSeconds?: number;
  forwardFrom?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  status?: string;
  createdAt: string;
  expiresAt?: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  replyTo?: {
    id: string;
    content?: string;
    sender: {
      id: string;
      displayName: string;
    };
  };
  attachments?: Attachment[];
  reactions?: Reaction[];
  decryptedContent?: string;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: string;
  user: User;
}

export interface Chat {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'CHANNEL' | 'SECRET' | 'SAVED';
  title?: string;
  description?: string;
  avatarUrl?: string;
  inviteCode?: string;
  unreadCount?: number;
  e2eeInitiatorPubkey?: string;
  e2eeReceiverPubkey?: string;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  messages: Message[];
}

interface State {
  user: User | null;
  token: string | null;
  adminUser: User | null;
  adminToken: string | null;
  chats: Chat[];
  activeChatId: string | null;
  messages: Message[];
  typingUsers: { [chatId: string]: string[] };
  activeFolder: 'all' | 'direct' | 'groups' | 'secret';
  activeModal: 'new_chat' | 'new_group' | 'group_info' | 'secret_keys' | 'join_group' | 'forward' | 'auth' | 'profile_edit' | 'contacts' | 'settings' | null;
  appView: 'messenger' | 'admin';
  showChatDetails: boolean;
  tonBalance: number;
  theme: 'dark' | 'light';
  editingMessage: Message | null;
  replyingToMessage: Message | null;
  forwardingMessage: Message | null;

  // Secret chat cryptographic keys mapping (chatId -> CryptoKey)
  secretKeys: { [chatId: string]: CryptoKey };
  secretFingerprints: { [chatId: string]: { emojis: string[]; hex: string } };

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setAdminUser: (adminUser: User | null) => void;
  setAdminToken: (adminToken: string | null) => void;
  adminLogout: () => void;
  setChats: (chats: Chat[]) => void;
  addChat: (chat: Chat) => void;
  updateChat: (chatId: string, partial: Partial<Chat>) => void;
  setActiveChatId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  editMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  clearChat: (chatId: string) => void;
  setEditingMessage: (message: Message | null) => void;
  setReplyingToMessage: (message: Message | null) => void;
  setForwardingMessage: (message: Message | null) => void;
  markChatAsRead: (chatId: string) => void;
  updateMessageReactions: (messageId: string, reactions: Reaction[]) => void;
  setTyping: (chatId: string, username: string, isTyping: boolean) => void;
  setUserStatus: (userId: string, isOnline: boolean, lastSeen?: string) => void;
  setActiveFolder: (folder: 'all' | 'direct' | 'groups' | 'secret') => void;
  setActiveModal: (modal: 'new_chat' | 'new_group' | 'group_info' | 'secret_keys' | 'join_group' | 'forward' | 'auth' | 'profile_edit' | 'contacts' | 'settings' | null) => void;
  setShowChatDetails: (show: boolean) => void;
  toggleChatDetails: () => void;
  setAppView: (view: 'messenger' | 'admin') => void;
  setSecretKey: (chatId: string, key: CryptoKey, fingerprint: { emojis: string[]; hex: string }) => void;
  setTonBalance: (balance: number) => void;
  toggleTheme: () => void;
}

export const useStore = create<State>((set) => ({
  user: null,
  token: localStorage.getItem('teleclone_token') || null,
  adminUser: null,
  adminToken: localStorage.getItem('klea_admin_token') || null,
  chats: [],
  activeChatId: null,
  messages: [],
  typingUsers: {},
  activeFolder: 'all',
  activeModal: null,
  appView: typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') ? 'admin' : 'messenger',
  showChatDetails: false,
  tonBalance: 14.52, // Initial mock balance for TON wallet
  theme: (localStorage.getItem('teleclone_theme') as 'dark' | 'light') || 'dark',
  editingMessage: null,
  replyingToMessage: null,
  forwardingMessage: null,
  secretKeys: {},
  secretFingerprints: {},

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('teleclone_token', token);
    } else {
      localStorage.removeItem('teleclone_token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('teleclone_token');
    if (typeof window !== 'undefined' && (window as any).__klea_socket) {
      (window as any).__klea_socket.disconnect();
      (window as any).__klea_socket = null;
    }
    set({ user: null, token: null, chats: [], activeChatId: null, messages: [] });
  },
  setAdminUser: (adminUser) => set({ adminUser }),
  setAdminToken: (adminToken) => {
    if (adminToken) {
      localStorage.setItem('klea_admin_token', adminToken);
    } else {
      localStorage.removeItem('klea_admin_token');
    }
    set({ adminToken });
  },
  adminLogout: () => {
    localStorage.removeItem('klea_admin_token');
    set({ adminUser: null, adminToken: null });
  },
  setChats: (chats) => set({ chats }),
  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats.filter((c) => c.id !== chat.id)],
    })),
  updateChat: (chatId, partial) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, ...partial } : c)),
    })),
  setActiveChatId: (id) => set({ activeChatId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      // Update chat list latest message preview
      const updatedChats = state.chats.map((c) => {
        if (c.id === message.chatId) {
          return {
            ...c,
            messages: [message],
            updatedAt: message.createdAt || new Date().toISOString(),
          };
        }
        return c;
      });

      // If this message belongs to the open chat, append to messages
      if (state.activeChatId === message.chatId) {
        if (!state.messages.some((m) => m.id === message.id)) {
          return {
            chats: updatedChats,
            messages: [...state.messages, message],
          };
        }
      }

      return { chats: updatedChats };
    }),
  updateMessageReactions: (messageId, reactions) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
    })),
  setTyping: (chatId, username, isTyping) =>
    set((state) => {
      const current = state.typingUsers[chatId] || [];
      const updated = isTyping
        ? Array.from(new Set([...current, username]))
        : current.filter((u) => u !== username);
      return { typingUsers: { ...state.typingUsers, [chatId]: updated } };
    }),
  setUserStatus: (userId, isOnline, lastSeen) =>
    set((state) => ({
      chats: state.chats.map((c) => ({
        ...c,
        members: c.members.map((m) =>
          m.user.id === userId
            ? { ...m, user: { ...m.user, isOnline, lastSeen: lastSeen || m.user.lastSeen } }
            : m
        ),
      })),
    })),
  setActiveFolder: (folder) => set({ activeFolder: folder }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setShowChatDetails: (show) => set({ showChatDetails: show }),
  toggleChatDetails: () => set((state) => ({ showChatDetails: !state.showChatDetails })),
  setAppView: (view) => {
    if (typeof window !== 'undefined') {
      if (view === 'admin' && window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin');
      } else if (view === 'messenger' && window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
    set({ appView: view });
  },
  setSecretKey: (chatId, key, fingerprint) =>
    set((state) => ({
      secretKeys: { ...state.secretKeys, [chatId]: key },
      secretFingerprints: { ...state.secretFingerprints, [chatId]: fingerprint },
    })),
  setTonBalance: (balance) => set({ tonBalance: balance }),
  editMessage: (message) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    })),
  clearChat: (chatId) =>
    set((state) => ({
      messages: state.activeChatId === chatId ? [] : state.messages,
      chats: state.chats.map((c) => (c.id === chatId ? { ...c, messages: [] } : c)),
    })),
  setEditingMessage: (message) => set({ editingMessage: message }),
  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  setForwardingMessage: (message) => set({ forwardingMessage: message }),
  markChatAsRead: (chatId) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, unreadCount: 0 } : c
      ),
      messages: state.messages.map((m) =>
        m.chatId === chatId ? { ...m, status: 'READ' } : m
      ),
    })),
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('teleclone_theme', nextTheme);
      return { theme: nextTheme };
    }),
  deleteMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),
}));
