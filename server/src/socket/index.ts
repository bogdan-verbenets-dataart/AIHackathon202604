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

export function setupSocket(server: HttpServer, prisma: PrismaClient, redisClient: Redis): SocketServer {
  const io = new SocketServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
  });

  // Separate Redis connection for pub/sub
  const redisSub = redisClient.duplicate();

  // Track socket -> {userId, tabId} mapping
  const socketUserMap = new Map<string, { userId: string; tabId: string }>();

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
    socket.on('auth', async (payload: { token: string; tabId: string }) => {
      try {
        const { token, tabId } = payload;
        if (!token || !tabId) {
          socket.emit('auth:error', { error: 'token and tabId required' });
          return;
        }

        let jwtPayload: { sessionId: string };
        try {
          jwtPayload = jwt.verify(token, config.jwtSecret) as { sessionId: string };
        } catch {
          socket.emit('auth:error', { error: 'Invalid token' });
          return;
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await prisma.userSession.findUnique({
          where: { id: jwtPayload.sessionId },
          include: { user: true },
        });

        if (!session || session.tokenHash !== tokenHash || session.expiresAt < new Date()) {
          socket.emit('auth:error', { error: 'Invalid session' });
          return;
        }

        const userId = session.user.id;
        socketUserMap.set(socket.id, { userId, tabId });

        const prevStatus = await getUserStatus(userId, redisClient);
        await setTabActive(userId, tabId, redisClient);
        const newStatus = await getUserStatus(userId, redisClient);

        if (prevStatus !== newStatus) {
          await publishPresenceChange(userId, newStatus, redisClient);
        }

        socket.emit('auth:success', { userId });
      } catch (err) {
        console.error('Socket auth error:', err);
        socket.emit('auth:error', { error: 'Internal error' });
      }
    });

    socket.on('join_chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave_chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('heartbeat', async (data: { tabId: string }) => {
      const info = socketUserMap.get(socket.id);
      if (!info) return;
      const { userId } = info;
      const tabId = data?.tabId ?? info.tabId;

      const prevStatus = await getUserStatus(userId, redisClient);
      await setTabActive(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });

    socket.on('afk', async (data: { tabId: string }) => {
      const info = socketUserMap.get(socket.id);
      if (!info) return;
      const { userId } = info;
      const tabId = data?.tabId ?? info.tabId;

      const prevStatus = await getUserStatus(userId, redisClient);
      await setTabAfk(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });

    socket.on('active', async (data: { tabId: string }) => {
      const info = socketUserMap.get(socket.id);
      if (!info) return;
      const { userId } = info;
      const tabId = data?.tabId ?? info.tabId;

      const prevStatus = await getUserStatus(userId, redisClient);
      await setTabActive(userId, tabId, redisClient);
      const newStatus = await getUserStatus(userId, redisClient);

      if (prevStatus !== newStatus) {
        await publishPresenceChange(userId, newStatus, redisClient);
      }
    });

    socket.on('disconnect', async () => {
      const info = socketUserMap.get(socket.id);
      if (!info) return;
      const { userId, tabId } = info;
      socketUserMap.delete(socket.id);

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
