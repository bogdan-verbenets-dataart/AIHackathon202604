import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import prisma from './db';
import redis from './redis';
import { setupSocket } from './socket';
import { setIo } from './modules/messages/router';

import authRouter from './modules/auth/router';
import usersRouter from './modules/users/router';
import sessionsRouter from './modules/sessions/router';
import roomsRouter from './modules/rooms/router';
import contactsRouter from './modules/contacts/router';
import attachmentsRouter from './modules/attachments/router';
import { chatsRouter, messagesRouter } from './modules/messages/router';

const app = express();

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/attachments', attachmentsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const io = setupSocket(server, prisma, redis);
setIo(io);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
});

export { app, server };
