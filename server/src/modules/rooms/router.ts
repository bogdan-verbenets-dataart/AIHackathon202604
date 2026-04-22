import { Router, Request, Response } from 'express';
import prisma from '../../db';
import redis from '../../redis';
import { authenticate } from '../../middleware/auth';
import { canViewRoomBans } from '../../lib/policy';
import {
  createRoomSchema,
  updateRoomSchema,
  createRoom,
  listPublicRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  banUser,
  unbanUser,
  getRoomBans,
  inviteUser,
  addAdmin,
  removeAdmin,
} from './service';

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rooms = await listPublicRooms(prisma);
    res.json({ data: rooms });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = createRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
      return;
    }
    const room = await createRoom(req.user!.id, parsed.data, prisma);
    res.status(201).json({ data: room });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const room = await getRoomById(req.params.id, prisma);
    res.json({ data: room });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
      return;
    }
    const room = await updateRoom(req.user!.id, req.params.id, parsed.data, prisma);
    res.json({ data: room });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteRoom(req.user!.id, req.params.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/:id/join', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await joinRoom(req.user!.id, req.params.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/:id/leave', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await leaveRoom(req.user!.id, req.params.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/:id/members', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const members = await getRoomMembers(req.user!.id, req.params.id, redis, prisma);
    res.json({ data: members });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/:id/bans/:userId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await banUser(req.user!.id, req.params.id, req.params.userId, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete('/:id/bans/:userId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await unbanUser(req.user!.id, req.params.id, req.params.userId, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/:id/bans', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed = await canViewRoomBans(req.user!.id, req.params.id, prisma);
    if (!allowed) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const bans = await getRoomBans(req.params.id, prisma);
    res.json({ data: bans });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/:id/invites/:userId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await inviteUser(req.user!.id, req.params.id, req.params.userId, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.post('/:id/admins/:userId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await addAdmin(req.user!.id, req.params.id, req.params.userId, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete('/:id/admins/:userId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await removeAdmin(req.user!.id, req.params.id, req.params.userId, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
