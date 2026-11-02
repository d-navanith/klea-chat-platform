import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { isUserOnline } from '../socket/index.js';

const router = Router();

// Get all chats for the current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
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
      orderBy: { updatedAt: 'desc' },
    });

    const chatsWithUnread = await Promise.all(
      chats.map(async (c) => {
        const unreadCount = await prisma.message.count({
          where: {
            chatId: c.id,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        });

        // Always ground member presence in live WebSocket connection state
        const membersWithLiveStatus = c.members.map((m) => ({
          ...m,
          user: {
            ...m.user,
            isOnline: isUserOnline(m.user.id),
          },
        }));

        return {
          ...c,
          members: membersWithLiveStatus,
          unreadCount,
        };
      })
    );

    return res.json({ chats: chatsWithUnread });
  } catch (error) {
    console.error('Failed to get chats:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Create or get direct chat
router.post('/direct', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { targetUserId, type = 'DIRECT', initiatorPubkey } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot create chat with yourself' });
    }

    // If it's a DIRECT chat (non-secret), check if one already exists
    if (type === 'DIRECT') {
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
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
          },
        },
      });

      if (existingChat) {
        return res.json({ chat: existingChat });
      }
    }

    // Create new chat
    const newChat = await prisma.chat.create({
      data: {
        type: type, // DIRECT or SECRET
        e2eeInitiatorPubkey: initiatorPubkey || null,
        members: {
          create: [
            { userId: userId!, role: 'OWNER' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
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
        messages: true,
      },
    });

    // Notify target user via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('new_chat', { chat: newChat });
    }

    return res.status(201).json({ chat: newChat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Create Private Group Chat
router.post('/group', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { title, description, avatarUrl, memberUserIds = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Group title is required' });
    }

    // Generate random unique invite code
    const inviteCode = 'join_' + Math.random().toString(36).substring(2, 10);

    // Initial members: Owner + selected users
    const allMembers = [
      { userId: userId!, role: 'OWNER' },
      ...memberUserIds
        .filter((id: string) => id !== userId)
        .map((id: string) => ({ userId: id, role: 'MEMBER' })),
    ];

    const groupChat = await prisma.chat.create({
      data: {
        type: 'GROUP',
        title: title.trim(),
        description: description?.trim() || null,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(title)}`,
        inviteCode,
        members: {
          create: allMembers,
        },
      },
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
        messages: true,
      },
    });

    // Notify all members via socket.io
    const io = req.app.get('io');
    if (io) {
      for (const m of allMembers) {
        io.to(`user:${m.userId}`).emit('new_chat', { chat: groupChat });
      }
    }

    return res.status(201).json({ chat: groupChat });
  } catch (error) {
    console.error('Error creating group:', error);
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get or Create Saved Messages Chat
router.post('/saved', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    let savedChat = await prisma.chat.findFirst({
      where: {
        type: 'SAVED',
        members: {
          some: { userId },
        },
      },
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
        },
      },
    });

    if (!savedChat) {
      savedChat = await prisma.chat.create({
        data: {
          type: 'SAVED',
          title: 'Saved Messages',
          members: {
            create: [{ userId: userId!, role: 'OWNER' }],
          },
        },
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
          messages: true,
        },
      });
    }

    return res.json({ chat: savedChat });
  } catch (error) {
    console.error('Error getting saved messages:', error);
    return res.status(500).json({ error: 'Failed to get saved messages' });
  }
});

// Join Group via Invite Code / Link
router.post('/join/:inviteCode', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user?.userId;

    const chat = await prisma.chat.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!chat || chat.type !== 'GROUP') {
      return res.status(404).json({ error: 'Invalid or expired invite link' });
    }

    const existingMember = chat.members.find((m) => m.userId === userId);
    if (existingMember) {
      // Already a member, fetch full chat
      const fullChat = await prisma.chat.findUnique({
        where: { id: chat.id },
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
          },
        },
      });
      return res.json({ chat: fullChat, alreadyMember: true });
    }

    // Add user as member
    await prisma.chatMember.create({
      data: {
        chatId: chat.id,
        userId: userId!,
        role: 'MEMBER',
      },
    });

    const fullChat = await prisma.chat.findUnique({
      where: { id: chat.id },
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
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chat.id}`).emit('chat_updated', { chatId: chat.id, chat: fullChat });
      io.to(`user:${userId}`).emit('new_chat', { chat: fullChat });
    }

    return res.json({ chat: fullChat });
  } catch (error) {
    console.error('Error joining group:', error);
    return res.status(500).json({ error: 'Failed to join group' });
  }
});

// Add member to group (Admin / Owner permission only)
router.post('/:id/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { targetUserId, username } = req.body;

    // Check requester permission
    const requester = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: userId! } },
    });

    if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only group admins can add members' });
    }

    let userToAddId = targetUserId;
    if (!userToAddId && username) {
      const found = await prisma.user.findUnique({
        where: { username: username.toLowerCase().trim() },
      });
      if (!found) return res.status(404).json({ error: 'User not found' });
      userToAddId = found.id;
    }

    if (!userToAddId) {
      return res.status(400).json({ error: 'targetUserId or username is required' });
    }

    // Check if already in group
    const already = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: userToAddId } },
    });

    if (already) {
      return res.status(400).json({ error: 'User is already a member of this group' });
    }

    await prisma.chatMember.create({
      data: {
        chatId: id,
        userId: userToAddId,
        role: 'MEMBER',
      },
    });

    const fullChat = await prisma.chat.findUnique({
      where: { id },
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
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${id}`).emit('chat_updated', { chatId: id, chat: fullChat });
      io.to(`user:${userToAddId}`).emit('new_chat', { chat: fullChat });
    }

    return res.json({ chat: fullChat });
  } catch (error) {
    console.error('Error adding member:', error);
    return res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from group (Admin / Owner permission only)
router.delete('/:id/members/:targetUserId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, targetUserId } = req.params;
    const userId = req.user?.userId;

    const requester = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: userId! } },
    });

    // User can remove themselves (leave group), or admins can remove other members
    const isSelf = targetUserId === userId;
    if (!isSelf && (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN'))) {
      return res.status(403).json({ error: 'Only group admins can remove members' });
    }

    await prisma.chatMember.delete({
      where: { chatId_userId: { chatId: id, userId: targetUserId } },
    });

    const fullChat = await prisma.chat.findUnique({
      where: { id },
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
        },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${id}`).emit('chat_updated', { chatId: id, chat: fullChat });
    }

    return res.json({ success: true, chat: fullChat });
  } catch (error) {
    console.error('Error removing member:', error);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Clear Chat History
router.delete('/:id/clear', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: userId! } },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.message.deleteMany({
      where: { chatId: id },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${id}`).emit('chat_cleared', { chatId: id });
      io.to(`chat:${id}`).emit('chat_updated', { chatId: id, lastMessage: null });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat:', error);
    return res.status(500).json({ error: 'Failed to clear chat' });
  }
});

// Edit Message (PATCH)
router.patch('/:chatId/messages/:messageId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.senderId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true,
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

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('message_edited', { message: updated });
    }

    return res.json({ message: updated });
  } catch (error) {
    console.error('Error editing message:', error);
    return res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Update E2EE Receiver Public Key for Secret Chat
router.post('/:id/e2ee-keys', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { receiverPubkey } = req.body;

    const chat = await prisma.chat.update({
      where: { id },
      data: { e2eeReceiverPubkey: receiverPubkey },
    });

    return res.json({ chat });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update E2EE keys' });
  }
});

// Get messages for a specific chat
router.get('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // Verify user is a member of this chat
    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId: id,
          userId: userId!,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Unauthorized to view this chat' });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId: id,
        isDeleted: false,
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
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message via REST API
router.post('/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: chatId } = req.params;
    const userId = req.user?.userId;
    const { content, ciphertext, iv, ttlSeconds, replyToId, forwardFrom, attachments } = req.body;

    // Verify membership
    const membership = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: userId!,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Unauthorized to post in this chat' });
    }

    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId!,
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
              create: attachments.map((a: any) => ({
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

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Broadcast via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('new_message', { message });

      const members = await prisma.chatMember.findMany({
        where: { chatId },
        select: { userId: true },
      });

      for (const m of members) {
        io.to(`user:${m.userId}`).emit('new_message', { message });
        io.to(`user:${m.userId}`).emit('chat_updated', {
          chatId,
          lastMessage: message,
        });
      }
    }

    return res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages in chat as read
router.post('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await prisma.message.updateMany({
      where: {
        chatId: id,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${id}`).emit('messages_read', { chatId: id });
    }

    return res.json({ success: true, chatId: id });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Delete message
router.delete('/:chatId/messages/:messageId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user?.userId;

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (msg.senderId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${chatId}`).emit('message_deleted', { messageId, chatId });

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
    }

    return res.json({ success: true, messageId });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
