import { Router, Request, Response } from 'express';
import prisma from '../../db';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../middleware/upload';
import { uploadAttachment, getAttachment } from './service';

const router = Router();

router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const comment = (req.body as { comment?: string }).comment;
      const attachment = await uploadAttachment(req.file, req.user!.id, comment, prisma);
      res.status(201).json({ data: attachment });
    } catch (err: unknown) {
      const e = err as { status?: number; message: string };
      res.status(e.status ?? 500).json({ error: e.message });
    }
  }
);

router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { attachment, filePath } = await getAttachment(req.params.id, req.user!.id, prisma);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    res.sendFile(filePath);
  } catch (err: unknown) {
    const e = err as { status?: number; message: string };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
