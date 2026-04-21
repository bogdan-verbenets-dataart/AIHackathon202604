import { Router, Request, Response } from 'express';
import prisma from '../../db';
import { authenticate } from '../../middleware/auth';
import { searchUsers, getUserById } from './service';

const router = Router();

router.get('/search', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string) ?? '';
    if (!q.trim()) {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }
    const users = await searchUsers(q, req.user!.id, prisma);
    res.json({ data: users });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.params.id, prisma);
    res.json({ data: user });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
