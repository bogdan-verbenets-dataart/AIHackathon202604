import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../db';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; username: string; createdAt: Date };
      session?: { id: string };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token: string | undefined = req.cookies?.token;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let payload: { sessionId: string };
    try {
      payload = jwt.verify(token, config.jwtSecret) as { sessionId: string };
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { sessionId } = payload;

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.tokenHash !== tokenHash) {
      res.status(401).json({ error: 'Session not found' });
      return;
    }

    if (session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    req.user = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
      createdAt: session.user.createdAt,
    };
    req.session = { id: session.id };

    next();
  } catch (err) {
    next(err);
  }
}
