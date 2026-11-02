import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { isUserOnline } from '../socket/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'teleclone_super_secret_jwt_key_2026_x';

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, displayName, avatarUrl, bio } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'Username, email, password, and displayName are required.' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase().trim() }, { email: email.toLowerCase().trim() }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        bio: bio || 'Hey there! I am using Klea.',
        role: 'EMPLOYEE',
        isApproved: false,
        isOnline: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isApproved: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    return res.status(201).json({
      message: 'Registration successful! Your account is pending administrator approval before you can sign in.',
      isApproved: false,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier (username/email) and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.toLowerCase().trim() },
          { email: identifier.toLowerCase().trim() },
        ],
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        error: 'Your account is currently pending administrator approval. Please wait for an administrator to activate your account.',
        isPendingApproval: true,
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        isApproved: user.isApproved,
        isOnline: true,
        lastSeen: user.lastSeen,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isApproved: true,
        isOnline: true,
        lastSeen: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// Update current user profile (Display Name, Username, Bio, AvatarUrl)
router.patch('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { displayName, username, bio, avatarUrl } = req.body;

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    const updateData: Record<string, any> = {};

    if (displayName) updateData.displayName = displayName.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (avatarUrl) updateData.avatarUrl = avatarUrl.trim();

    if (username && username.toLowerCase().trim() !== currentUser.username) {
      const cleanUsername = username.toLowerCase().trim();
      const conflict = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (conflict && conflict.id !== userId) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      updateData.username = cleanUsername;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isApproved: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    return res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Search and list all users (for creating new chats)
router.get('/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user?.userId },
        ...(q
          ? {
              OR: [
                { username: { contains: q.toLowerCase() } },
                { displayName: { contains: q } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isOnline: true,
        lastSeen: true,
      },
      take: 30,
    });

    const usersWithLiveStatus = users.map((u) => ({
      ...u,
      isOnline: isUserOnline(u.id),
    }));

    return res.json({ users: usersWithLiveStatus });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to search users.' });
  }
});

export default router;
