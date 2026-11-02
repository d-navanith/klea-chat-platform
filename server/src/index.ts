import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chats.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import { setupSocketIO } from './socket/index.js';
import { seedDatabase } from './seed.js';
import { prisma } from './prisma.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Real-Time Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000, // ping every 10s
  pingTimeout: 5000,   // timeout after 5s without response -> ~15s disconnect detection
});

app.set('io', io);
setupSocketIO(io);

// Start Server
server.listen(PORT, async () => {
  console.log(`[Server] Klea backend running on http://localhost:${PORT}`);
  try {
    // Reset any stale presence flags on server start
    await prisma.user.updateMany({
      data: { isOnline: false },
    });
    console.log('[Presence] All users reset to offline on server startup');
    await seedDatabase();
  } catch (err) {
    console.error('Server init error:', err);
  }
});
