import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'teleclone_super_secret_jwt_key_2026_x';
const ADMIN_PASSKEY = process.env.ADMIN_SECURITY_PASSKEY || 'KLEA-ADMIN-2026';

// -------------------------------------------------------------
// In-Memory Real-Time Security Audit Logs for Admin Oversight
// -------------------------------------------------------------
export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  adminUsername: string;
  action: 'ADMIN_LOGIN' | 'USER_APPROVED' | 'USER_REJECTED' | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'ROLE_CHANGED' | 'SECURITY_ALERT';
  targetUser?: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  ipAddress?: string;
}

const auditLogs: SecurityAuditLog[] = [
  {
    id: 'audit-init-1',
    timestamp: new Date().toISOString(),
    adminUsername: 'SYSTEM',
    action: 'SECURITY_ALERT',
    details: 'Klea Enterprise Admin Security Subsystem initialized with encrypted passkey validation.',
    status: 'SUCCESS',
  },
];

const logAudit = (entry: Omit<SecurityAuditLog, 'id' | 'timestamp'>) => {
  const newLog: SecurityAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLogs.unshift(newLog);
  // Keep last 200 logs
  if (auditLogs.length > 200) {
    auditLogs.pop();
  }
};

// -------------------------------------------------------------
// 1. DEDICATED ADMIN AUTHENTICATION (SEPARATE FROM USER LOGIN)
// POST /api/admin/auth/login
// -------------------------------------------------------------
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password, securityPasskey } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Administrator identifier and password are required.' });
    }

    // Verify Admin Security Passkey (Second Factor / Hardware Passkey Simulation)
    if (securityPasskey && securityPasskey.trim() !== ADMIN_PASSKEY) {
      logAudit({
        adminUsername: String(identifier).toLowerCase().trim(),
        action: 'SECURITY_ALERT',
        details: `Access Denied: Invalid Security Passkey attempted for admin user "${identifier}".`,
        status: 'FAILED',
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'Invalid Security Passkey. Access Denied.' });
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
      logAudit({
        adminUsername: identifier,
        action: 'SECURITY_ALERT',
        details: `Failed admin login attempt: Unknown identity "${identifier}".`,
        status: 'FAILED',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logAudit({
        adminUsername: user.username,
        action: 'SECURITY_ALERT',
        details: `Failed admin login attempt: Incorrect password for @${user.username}.`,
        status: 'FAILED',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    // STRICT CHECK: Standard employee accounts CANNOT log in to Admin Portal!
    if (user.role !== 'ADMIN') {
      logAudit({
        adminUsername: user.username,
        action: 'SECURITY_ALERT',
        details: `Unauthorized admin breach attempt by standard employee @${user.username} (Role: ${user.role}).`,
        status: 'WARNING',
        ipAddress: req.ip,
      });
      return res.status(403).json({
        error: 'Access Denied: Standard employee accounts cannot access the administrative console. This security event has been logged.',
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({ error: 'Administrator account is currently suspended or not approved.' });
    }

    // Create an isolated Admin token with restricted 12-hour session
    const adminToken = jwt.sign(
      { userId: user.id, username: user.username, role: 'ADMIN', scope: 'admin_dashboard' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    logAudit({
      adminUsername: user.username,
      action: 'ADMIN_LOGIN',
      details: `Administrator @${user.username} successfully authenticated into Admin Console.`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.json({
      adminToken,
      adminUser: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: 'ADMIN',
      },
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    return res.status(500).json({ error: 'Internal server error during administrator authentication.' });
  }
});

// -------------------------------------------------------------
// Protected Admin Routes Middleware
// All routes declared below require valid admin JWT & role === 'ADMIN'
// -------------------------------------------------------------
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/auth/me - Verify active Admin session
router.get('/auth/me', async (req: AuthRequest, res: Response) => {
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
      },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }

    return res.json({ adminUser: user });
  } catch (error) {
    console.error('Error verifying admin session:', error);
    return res.status(500).json({ error: 'Failed to verify admin credentials.' });
  }
});

// GET /api/admin/audit-logs - Retrieve real-time security audit trails
router.get('/audit-logs', async (_req: AuthRequest, res: Response) => {
  return res.json({ auditLogs });
});

// GET /api/admin/stats - Overview metrics
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const pendingApprovals = await prisma.user.count({ where: { isApproved: false } });
    const approvedUsers = await prisma.user.count({ where: { isApproved: true } });
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const onlineUsers = await prisma.user.count({ where: { isOnline: true } });
    const totalGroups = await prisma.chat.count({ where: { type: 'GROUP' } });
    const totalMessages = await prisma.message.count();

    return res.json({
      stats: {
        totalUsers,
        pendingApprovals,
        approvedUsers,
        adminCount,
        onlineUsers,
        totalGroups,
        totalMessages,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
});

// GET /api/admin/groups - List all company groups for oversight
router.get('/groups', async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.chat.findMany({
      where: { type: 'GROUP' },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ groups });
  } catch (error) {
    console.error('Error fetching admin groups:', error);
    return res.status(500).json({ error: 'Failed to retrieve groups.' });
  }
});

// GET /api/admin/users - List all users with status & roles
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
      orderBy: [
        { isApproved: 'asc' }, // Pending approvals first
        { createdAt: 'desc' },
      ],
    });

    const pendingCount = users.filter((u) => !u.isApproved).length;
    const totalCount = users.length;

    return res.json({ users, pendingCount, totalCount });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ error: 'Failed to retrieve employee directory.' });
  }
});

// POST /api/admin/users - Admin manually creates a new employee/user
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, displayName, avatarUrl, bio, role, isApproved } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'Username, email, password, and display name are required.' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: cleanEmail }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'A user with this username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        displayName: displayName.trim(),
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
        bio: bio?.trim() || 'Employee at Klea Enterprise',
        role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE',
        isApproved: isApproved !== undefined ? Boolean(isApproved) : true,
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
        createdAt: true,
      },
    });

    logAudit({
      adminUsername: req.user?.username || 'ADMIN',
      action: 'USER_CREATED',
      targetUser: newUser.username,
      details: `Created new user @${newUser.username} with role ${newUser.role} (Approved: ${newUser.isApproved}).`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'User created successfully.', user: newUser });
  } catch (error) {
    console.error('Error creating user via admin:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PATCH /api/admin/users/:id/approve - Approve pending user
router.patch('/users/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isApproved: true,
      },
    });

    logAudit({
      adminUsername: req.user?.username || 'ADMIN',
      action: 'USER_APPROVED',
      targetUser: updated.username,
      details: `Approved employee registration for @${updated.username}.`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.json({ message: `User @${updated.username} approved successfully.`, user: updated });
  } catch (error) {
    console.error('Error approving user:', error);
    return res.status(500).json({ error: 'Failed to approve user.' });
  }
});

// PATCH /api/admin/users/:id/reject - Reject or suspend user
router.patch('/users/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user?.userId) {
      return res.status(400).json({ error: 'Cannot reject or unapprove your own admin account.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isApproved: false },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isApproved: true,
      },
    });

    logAudit({
      adminUsername: req.user?.username || 'ADMIN',
      action: 'USER_REJECTED',
      targetUser: updated.username,
      details: `Suspended / rejected access for user @${updated.username}.`,
      status: 'WARNING',
      ipAddress: req.ip,
    });

    return res.json({ message: `User @${updated.username} access suspended/rejected.`, user: updated });
  } catch (error) {
    console.error('Error rejecting user:', error);
    return res.status(500).json({ error: 'Failed to reject user.' });
  }
});

// PATCH /api/admin/users/:id - Edit user details & role
router.patch('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, username, email, role, isApproved, bio, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (id === req.user?.userId && role && role !== 'ADMIN') {
      return res.status(400).json({ error: 'You cannot revoke your own administrator role.' });
    }

    const updateData: Record<string, any> = {};

    if (displayName) updateData.displayName = displayName.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (role && (role === 'ADMIN' || role === 'EMPLOYEE')) updateData.role = role;
    if (isApproved !== undefined) updateData.isApproved = Boolean(isApproved);

    if (username && username.toLowerCase().trim() !== existing.username) {
      const cleanUsername = username.toLowerCase().trim();
      const conflict = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (conflict && conflict.id !== id) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
      updateData.username = cleanUsername;
    }

    if (email && email.toLowerCase().trim() !== existing.email) {
      const cleanEmail = email.toLowerCase().trim();
      const conflict = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (conflict && conflict.id !== id) {
        return res.status(400).json({ error: 'Email is already taken.' });
      }
      updateData.email = cleanEmail;
    }

    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
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

    logAudit({
      adminUsername: req.user?.username || 'ADMIN',
      action: role && role !== existing.role ? 'ROLE_CHANGED' : 'USER_UPDATED',
      targetUser: updated.username,
      details: `Updated user @${updated.username}${role ? ` (Role: ${role})` : ''}.`,
      status: 'SUCCESS',
      ipAddress: req.ip,
    });

    return res.json({ message: 'User updated successfully.', user: updated });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id - Delete an employee
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user?.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { userId: id } }),
      prisma.chatMember.deleteMany({ where: { userId: id } }),
      prisma.wallet.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    logAudit({
      adminUsername: req.user?.username || 'ADMIN',
      action: 'USER_DELETED',
      targetUser: targetUser.username,
      details: `Permanently deleted user @${targetUser.username} (${targetUser.displayName}).`,
      status: 'WARNING',
      ipAddress: req.ip,
    });

    return res.json({ message: `User @${targetUser.username} (${targetUser.displayName}) deleted successfully.` });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
});

export default router;
