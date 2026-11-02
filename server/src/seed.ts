import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

export const seedDatabase = async () => {
  const count = await prisma.user.count();
  if (count > 0) {
    // Ensure durov is ADMIN and approved, and demo users are approved
    await prisma.user.updateMany({
      where: { username: 'durov' },
      data: { role: 'ADMIN', isApproved: true },
    });
    await prisma.user.updateMany({
      where: { username: { in: ['alice', 'bob'] } },
      data: { isApproved: true },
    });
    return;
  }

  console.log('[Seed] Seeding initial Klea demo accounts...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const durov = await prisma.user.create({
    data: {
      username: 'durov',
      email: 'durov@telegram.org',
      passwordHash,
      displayName: 'Pavel Durov',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
      bio: 'Telegram & TON Founder. Freedom & Privacy.',
      role: 'ADMIN',
      isApproved: true,
      isOnline: false,
    },
  });

  const alice = await prisma.user.create({
    data: {
      username: 'alice',
      email: 'alice@example.com',
      passwordHash,
      displayName: 'Alice Wonderland',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
      bio: 'Exploring the crypto rabbit hole & building Telegram Mini Apps 🚀',
      role: 'EMPLOYEE',
      isApproved: true,
      isOnline: false,
    },
  });

  const bob = await prisma.user.create({
    data: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash,
      displayName: 'Bob Builder',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      bio: 'Can we build it? Yes we can! 🛠️',
      role: 'EMPLOYEE',
      isApproved: true,
      isOnline: false,
    },
  });

  // Create welcome direct chat between Durov and Alice
  const chat = await prisma.chat.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: durov.id, role: 'OWNER' },
          { userId: alice.id, role: 'MEMBER' },
        ],
      },
    },
  });

  await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: durov.id,
      content: 'Welcome to Klea! 🚀 Built with high-speed real-time messaging, secret chats, and private groups.',
      status: 'READ',
    },
  });

  console.log('[Seed] Successfully seeded demo users: durov, alice, bob (password: password123)');
};
