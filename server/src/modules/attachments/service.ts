import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { canAccessAttachment } from '../../lib/policy';
import { config } from '../../config';

export async function uploadAttachment(
  file: Express.Multer.File,
  userId: string,
  comment: string | undefined,
  prisma: PrismaClient
) {
  const attachment = await prisma.attachment.create({
    data: {
      originalName: file.originalname,
      storagePath: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      comment: comment ?? null,
      uploaderId: userId,
    },
  });
  return attachment;
}

export async function getAttachment(
  attachmentId: string,
  userId: string,
  prisma: PrismaClient
) {
  const allowed = await canAccessAttachment(userId, attachmentId, prisma);
  if (!allowed) throw Object.assign(new Error('Forbidden'), { status: 403 });

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) throw Object.assign(new Error('Attachment not found'), { status: 404 });

  const filePath = path.join(config.uploadsDir, attachment.storagePath);
  if (!fs.existsSync(filePath)) {
    throw Object.assign(new Error('File not found on disk'), { status: 404 });
  }

  return { attachment, filePath };
}
