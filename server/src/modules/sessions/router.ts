import { Router, Request, Response } from 'express';
import prisma from '../../db';
import { authenticate } from '../../middleware/auth';
import { listSessions, invalidateSession } from './service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await listSessions(req.user!.id, prisma);
    res.json({ data: sessions });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    await invalidateSession(req.params.id, req.user!.id, prisma);
    res.json({ data: { ok: true } });
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
