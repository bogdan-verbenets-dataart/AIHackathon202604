import { Router, Request, Response } from 'express';
import prisma from '../../db';
import { authenticate } from '../../middleware/auth';
import {
  sendMessageSchema,
  editMessageSchema,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markChatRead,
  listChats,
} from './service';

// io is set after socket setup
let ioInstance: import('socket.io').Server | null = null;
export function setIo(io: import('socket.io').Server) {
  ioInstance = io;
}

const chatsRouter = Router();
const messagesRouter = Router();

chatsRouter.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const chats = await listChats(req.user!.id, prisma);
    res.json({ data: chats });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

chatsRouter.get('/:chatId/messages', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const before = req.query.before as string | undefined;
    const limit = parseInt((req.query.limit as string) ?? '50', 10);
    const messages = await getMessages(req.params.chatId, req.user!.id, before, limit, prisma);
    res.json({ data: messages });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

chatsRouter.post('/:chatId/messages', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
      return;
    }
    const msg = await sendMessage(req.params.chatId, req.user!.id, parsed.data, ioInstance, prisma);
    res.status(201).json({ data: msg });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

chatsRouter.post('/:chatId/read', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await markChatRead(req.params.chatId, req.user!.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

messagesRouter.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = editMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
      return;
    }
    const msg = await editMessage(req.params.id, req.user!.id, parsed.data, ioInstance, prisma);
    res.json({ data: msg });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

messagesRouter.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteMessage(req.params.id, req.user!.id, ioInstance, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export { chatsRouter, messagesRouter };
