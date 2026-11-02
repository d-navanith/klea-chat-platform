import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'teleclone_super_secret_jwt_key_2026_x';

// Map of userId -> Set of socket IDs
const userSockets = new Map<string, Set<string>>();

// Real-Time presence helpers for REST routes and background reconciler
export const isUserOnline = (userId: string): boolean => {
  const sockets = userSockets.get(userId);
  return !!sockets && sockets.size > 0;
};

export const getOnlineUserIds = (): string[] => {
  const ids: string[] = [];
  for (const [uid, sockets] of userSockets.entries()) {
    if (sockets && sockets.size > 0) {
      ids.push(uid);
    }
  }
  return ids;
};

export const setupSocketIO = (io: SocketIOServer) => {
  // Background reconciler: periodically sweep stale 'isOnline: true' in database
  setInterval(async () => {
    try {
      const dbOnlineUsers = await prisma.user.findMany({
        where: { isOnline: true },
        select: { id: true, username: true },
      });

      for (const u of dbOnlineUsers) {
        if (!isUserOnline(u.id)) {
          const lastSeen = new Date();
          await prisma.user.update({
            where: { id: u.id },
            data: { isOnline: false, lastSeen },
          });
          io.emit('user_status', { userId: u.id, isOnline: false, lastSeen });
          console.log(`[Presence] Reconciled stale user @${u.username} -> OFFLINE`);
        }
      }
    } catch (err) {
      console.error('[Presence] Reconciler error:', err);
    }
  }, 15000);
  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    console.log(`[Socket] User connected: @${username} (${socket.id})`);

    // Join user's personal room for direct private alerts immediately
    socket.join(`user:${userId}`);

    // Asynchronously update presence & auto-join chat rooms in background (never block listener attachment)
    (async () => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true, lastSeen: new Date() },
        });
        io.emit('user_status', { userId, isOnline: true, lastSeen: new Date() });

        const userMemberships = await prisma.chatMember.findMany({
          where: { userId },
          select: { chatId: true },
        });
        for (const m of userMemberships) {
          socket.join(`chat:${m.chatId}`);
        }
      } catch (err) {
        console.error('Error during connection initialization:', err);
      }
    })();

    // Join a chat room
    socket.on('join_chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      console.log(`[Socket] @${username} joined room chat:${chatId}`);
    });

    // Leave a chat room
    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // Send Message
    socket.on('send_message', async (data: {
      chatId: string;
      content?: string;
      ciphertext?: string;
      iv?: string;
      ttlSeconds?: number;
      replyToId?: string;
      forwardFrom?: string;
      attachments?: Array<{ fileUrl: string; fileName: string; fileType: string; fileSize: number }>;
    }) => {
      console.log(`[Socket] send_message received from @${username} for chat:`, data.chatId);
      try {
        const { chatId, content, ciphertext, iv, ttlSeconds, replyToId, forwardFrom, attachments } = data;

        // Calculate expiresAt if ttlSeconds is set (Secret chat auto-destruct)
        const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            replyToId,
            forwardFrom,
            content,
            ciphertext,
            iv,
            ttlSeconds,
            expiresAt,
            status: 'SENT',
            attachments: attachments
              ? {
                  create: attachments.map((a) => ({
                    fileUrl: a.fileUrl,
                    fileName: a.fileName,
                    fileType: a.fileType,
                    fileSize: a.fileSize,
                  })),
                }
              : undefined,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: {
                  select: {
                    id: true,
                    displayName: true,
                  },
                },
              },
            },
            attachments: true,
            reactions: true,
          },
        });

        // Update chat updatedAt timestamp
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });

        // Broadcast new message to room
        io.to(`chat:${chatId}`).emit('new_message', { message });

        // Also notify chat members for chat list updates
        const members = await prisma.chatMember.findMany({
          where: { chatId },
          select: { userId: true },
        });

        const fullChat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                attachments: true,
                reactions: true,
              },
            },
          },
        });

        for (const member of members) {
          io.to(`user:${member.userId}`).emit('new_message', { message });
          io.to(`user:${member.userId}`).emit('chat_updated', {
            chatId,
            chat: fullChat,
            lastMessage: message,
          });
        }
      } catch (err) {
        console.error('Socket send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Delete message
    socket.on('delete_message', async (data: { messageId: string; chatId: string }) => {
      try {
        const { messageId, chatId } = data;
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!msg) return;

        // Verify sender
        if (msg.senderId !== userId) {
          return socket.emit('error', { message: 'Unauthorized to delete message' });
        }

        await prisma.message.delete({
          where: { id: messageId },
        });

        // Broadcast to room
        io.to(`chat:${chatId}`).emit('message_deleted', { messageId, chatId });

        // Update latest message for members
        const lastMsg = await prisma.message.findFirst({
          where: { chatId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          include: {
            attachments: true,
            reactions: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

        const members = await prisma.chatMember.findMany({
          where: { chatId },
          select: { userId: true },
        });

        for (const member of members) {
          io.to(`user:${member.userId}`).emit('chat_updated', {
            chatId,
            lastMessage: lastMsg || null,
          });
        }
      } catch (err) {
        console.error('Socket delete_message error:', err);
      }
    });

    // Edit message
    socket.on('edit_message', async (data: { messageId: string; chatId: string; content: string }) => {
      try {
        const { messageId, chatId, content } = data;
        const msg = await prisma.message.findUnique({ where: { id: messageId } });
        if (!msg || msg.senderId !== userId) return;

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content: content.trim(), isEdited: true },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            attachments: true,
            reactions: true,
          },
        });

        io.to(`chat:${chatId}`).emit('message_edited', { message: updated });

        // Update latest message in sidebar
        io.to(`chat:${chatId}`).emit('chat_updated', {
          chatId,
          lastMessage: updated,
        });
      } catch (err) {
        console.error('Socket edit_message error:', err);
      }
    });

    // Clear chat
    socket.on('clear_chat', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;
        const membership = await prisma.chatMember.findUnique({
          where: { chatId_userId: { chatId, userId } },
        });
        if (!membership) return;

        await prisma.message.deleteMany({ where: { chatId } });

        io.to(`chat:${chatId}`).emit('chat_cleared', { chatId });
        io.to(`chat:${chatId}`).emit('chat_updated', { chatId, lastMessage: null });
      } catch (err) {
        console.error('Socket clear_chat error:', err);
      }
    });

    // Forward message
    socket.on('forward_message', async (data: { messageId: string; targetChatIds: string[] }) => {
      try {
        const { messageId, targetChatIds } = data;
        const originalMsg = await prisma.message.findUnique({
          where: { id: messageId },
          include: { sender: true, attachments: true },
        });

        if (!originalMsg) return;

        for (const targetChatId of targetChatIds) {
          const newMsg = await prisma.message.create({
            data: {
              chatId: targetChatId,
              senderId: userId,
              content: originalMsg.content,
              forwardFrom: originalMsg.sender.displayName,
              status: 'SENT',
              attachments: originalMsg.attachments.length > 0
                ? {
                    create: originalMsg.attachments.map((a) => ({
                      fileUrl: a.fileUrl,
                      fileName: a.fileName,
                      fileType: a.fileType,
                      fileSize: a.fileSize,
                    })),
                  }
                : undefined,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
              attachments: true,
              reactions: true,
            },
          });

          await prisma.chat.update({
            where: { id: targetChatId },
            data: { updatedAt: new Date() },
          });

          io.to(`chat:${targetChatId}`).emit('new_message', { message: newMsg });

          const members = await prisma.chatMember.findMany({
            where: { chatId: targetChatId },
            select: { userId: true },
          });

          for (const member of members) {
            io.to(`user:${member.userId}`).emit('chat_updated', {
              chatId: targetChatId,
              lastMessage: newMsg,
            });
          }
        }
      } catch (err) {
        console.error('Socket forward_message error:', err);
      }
    });

    // Mark as read
    socket.on('mark_as_read', async (data: { chatId: string }) => {
      try {
        const { chatId } = data;
        await prisma.message.updateMany({
          where: {
            chatId,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
          data: { status: 'READ' },
        });

        io.to(`chat:${chatId}`).emit('messages_read', { chatId });
      } catch (err) {
        console.error('Socket mark_as_read error:', err);
      }
    });

    // Typing Indicators
    socket.on('typing_start', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('user_typing', {
        chatId: data.chatId,
        userId,
        username,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data: { chatId: string }) => {
      socket.to(`chat:${data.chatId}`).emit('user_typing', {
        chatId: data.chatId,
        userId,
        username,
        isTyping: false,
      });
    });

    // Reactions
    socket.on('toggle_reaction', async (data: { messageId: string; chatId: string; emoji: string }) => {
      try {
        const { messageId, chatId, emoji } = data;
        const existing = await prisma.reaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId,
              userId,
              emoji,
            },
          },
        });

        if (existing) {
          await prisma.reaction.delete({
            where: { id: existing.id },
          });
        } else {
          await prisma.reaction.create({
            data: {
              messageId,
              userId,
              emoji,
            },
          });
        }

        const updatedReactions = await prisma.reaction.findMany({
          where: { messageId },
          include: {
            user: { select: { id: true, username: true, displayName: true } },
          },
        });

        io.to(`chat:${chatId}`).emit('reactions_updated', {
          messageId,
          reactions: updatedReactions,
        });
      } catch (err) {
        console.error('Reaction error:', err);
      }
    });

    // Pin / Unpin message
    socket.on('toggle_pin_message', async (data: { messageId: string; chatId: string }) => {
      try {
        const { messageId, chatId } = data;
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            attachments: true,
          },
        });
        if (!msg) return;

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { isPinned: !msg.isPinned },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            attachments: true,
          },
        });

        io.to(`chat:${chatId}`).emit('message_pin_updated', {
          messageId,
          chatId,
          isPinned: updated.isPinned,
          message: updated,
        });
      } catch (err) {
        console.error('Socket toggle_pin_message error:', err);
      }
    });

    // E2EE Secret Chat Key Exchange Handshake
    socket.on('e2ee_key_offer', (data: { chatId: string; targetUserId: string; initiatorPubkey: string }) => {
      io.to(`user:${data.targetUserId}`).emit('e2ee_key_offer', {
        chatId: data.chatId,
        initiatorUserId: userId,
        initiatorPubkey: data.initiatorPubkey,
      });
    });

    socket.on('e2ee_key_answer', (data: { chatId: string; targetUserId: string; receiverPubkey: string }) => {
      io.to(`user:${data.targetUserId}`).emit('e2ee_key_answer', {
        chatId: data.chatId,
        receiverUserId: userId,
        receiverPubkey: data.receiverPubkey,
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      try {
        const userSocketsSet = userSockets.get(userId);
        if (userSocketsSet) {
          userSocketsSet.delete(socket.id);
          if (userSocketsSet.size === 0) {
            userSockets.delete(userId);
            const lastSeen = new Date();
            await prisma.user.update({
              where: { id: userId },
              data: { isOnline: false, lastSeen },
            });
            io.emit('user_status', { userId, isOnline: false, lastSeen });
            console.log(`[Presence] @${username} is now completely OFFLINE`);
          }
        }
      } catch (err) {
        console.error(`[Presence] Error updating disconnect for @${username}:`, err);
      }
      console.log(`[Socket] Disconnected: @${username} (${socket.id})`);
    });
  });
};
