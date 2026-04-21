import { Router, Request, Response } from 'express';
import prisma from '../../db';
import redis from '../../redis';
import { authenticate } from '../../middleware/auth';
import {
  sendFriendRequestSchema,
  respondFriendRequestSchema,
  listFriends,
  sendFriendRequest,
  listIncomingRequests,
  respondToRequest,
  removeFriend,
  blockUser,
  unblockUser,
  listBlocks,
  getOrCreatePersonalChat,
} from './service';

const router = Router();

router.get('/friends', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const friends = await listFriends(req.user!.id, redis, prisma);
    res.json({ data: friends });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/friends/requests', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = sendFriendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
      return;
    }
    const request = await sendFriendRequest(req.user!.id, parsed.data, prisma);
    res.status(201).json({ data: request });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/friends/requests', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await listIncomingRequests(req.user!.id, prisma);
    res.json({ data: requests });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/friends/requests/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = respondFriendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
      return;
    }
    await respondToRequest(req.user!.id, req.params.id, parsed.data.action, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete('/friends/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await removeFriend(req.user!.id, req.params.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/blocks', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }
    await blockUser(req.user!.id, userId, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete('/blocks/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await unblockUser(req.user!.id, req.params.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/blocks', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const blocks = await listBlocks(req.user!.id, prisma);
    res.json({ data: blocks });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/:userId/chat', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await getOrCreatePersonalChat(req.user!.id, req.params.userId, prisma);
    res.json({ data: chat });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
