import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import {
  setTabActive,
  setTabAfk,
  removeTab,
  getUserStatus,
  publishPresenceChange,
  PresenceStatus,
} from './presence';

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

export function setupSocket(server: HttpServer, prisma: PrismaClient, redisClient: Redis): SocketServer {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Separate Redis connection for pub/sub
  const redisSub = redisClient.duplicate();

  // Track socket -> tabId mapping (userId comes from socket.data.userId set by middleware)
  const socketTabMap = new Map<string, string>();

  // Socket middleware: authenticate via the httpOnly 'token' cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? '';
      const cookies = parseCookieHeader(cookieHeader);
      const token = cookies['token'];
      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      let jwtPayload: { sessionId: string };
      try {
        jwtPayload = jwt.verify(token, config.jwtSecret) as { sessionId: string };
      } catch {
        next(new Error('Unauthorized'));
        return;
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await prisma.userSession.findUnique({
        where: { id: jwtPayload.sessionId },
        include: { user: true },
      });

      if (!session || session.tokenHash !== tokenHash || session.expiresAt < new Date()) {
        next(new Error('Unauthorized'));
        return;
      }

      socket.data.userId = session.user.id;
      next();
    } catch {
      next(new Error('Internal error'));
    }
  });

  redisSub.subscribe('presence:updates', (err) => {
    if (err) console.error('Redis subscribe error:', err);
  });

  redisSub.on('message', (_channel: string, message: string) => {
    try {
      const data = JSON.parse(message) as { userId: string; status: PresenceStatus };
      io.emit('presence:update', data);
    } catch {
      // ignore parse errors
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.on('join_chat', (payload: string | { chatId: string }) => {
      const chatId = typeof payload === 'string' ? payload : payload?.chatId;
      if (chatId) socket.join(`chat:${chatId}`);
    });

    socket.on('leave_chat', (payload: string | { chatId: string }) => {
      const chatId = typeof payload === 'string' ? payload : payload?.chatId;
      if (chatId) socket.leave(`chat:${chatId}`);
    });

    socket.on('heartbeat', async (data: { tabId: string }) => {
      const tabId = data?.tabId;
      if (!tabId) return;
      socketTabMap.set(socket.id, tabId);

      const prevStatus = await getUserStatus(userId, redisClient);
      await setTabActive(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });

    socket.on('afk', async (data: { tabId: string }) => {
      const tabId = data?.tabId ?? socketTabMap.get(socket.id);
      if (!tabId) return;

      const prevStatus = await getUserStatus(userId, redisClient);
      await setTabAfk(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });

    socket.on('active', async (data: { tabId: string }) => {
      const tabId = data?.tabId ?? socketTabMap.get(socket.id);
      if (!tabId) return;

      const prevStatus = await getUserStatus(userId, redisClient);
      await setTabActive(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });

    socket.on('disconnect', async () => {
      const tabId = socketTabMap.get(socket.id);
      socketTabMap.delete(socket.id);
      if (!tabId) return;

      const prevStatus = await getUserStatus(userId, redisClient);
      await removeTab(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });
  });

  return io;
}
