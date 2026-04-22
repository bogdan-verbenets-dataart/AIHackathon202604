import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../../config';

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/, 'Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function registerUser(
  data: z.infer<typeof registerSchema>,
  prisma: PrismaClient
) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { username: data.username }] },
  });
  if (existing) {
    throw Object.assign(new Error('Email or username already taken'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { email: data.email, username: data.username, passwordHash },
    select: { id: true, email: true, username: true, createdAt: true },
  });
  return user;
}

export async function loginUser(
  data: z.infer<typeof loginSchema>,
  userAgent: string | undefined,
  ipAddress: string | undefined,
  prisma: PrismaClient
) {
  const user = await prisma.user.findFirst({ where: { email: data.email, deletedAt: null } });
  if (!user || !await bcrypt.compare(data.password, user.passwordHash)) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Create a placeholder session to get the ID, then sign JWT, then update tokenHash
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: 'placeholder',
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    },
  });

  const token = jwt.sign({ sessionId: session.id }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '30d',
  });

  const tokenHash = hashToken(token);
  await prisma.userSession.update({ where: { id: session.id }, data: { tokenHash } });

  return {
    token,
    user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
    session: { id: session.id },
  };
}

export async function logoutUser(sessionId: string, prisma: PrismaClient) {
  await prisma.userSession.delete({ where: { id: sessionId } }).catch(() => {/* already deleted */});
}

export async function forgotPassword(email: string, prisma: PrismaClient) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal if user exists
    return { token: null };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return { token: rawToken };
}

export async function resetPassword(
  data: z.infer<typeof resetPasswordSchema>,
  prisma: PrismaClient
) {
  const tokenHash = hashToken(data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired reset token'), { status: 400 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
}

export async function changePassword(
  userId: string,
  data: z.infer<typeof changePasswordSchema>,
  prisma: PrismaClient
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const valid = await bcrypt.compare(data.oldPassword, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Old password incorrect'), { status: 400 });

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function deleteAccount(userId: string, prisma: PrismaClient) {
  const deletedAt = new Date();
  const deletedEmail = `deleted+${userId}-${deletedAt.getTime()}@deleted.local`;
  const deletedUsername = `deleted_${userId.replace(/-/g, '').slice(0, 20)}_${deletedAt.getTime()}`;

  const filesToDelete = await prisma.$transaction(async (tx) => {
    const ownedRoomIds = (await tx.room.findMany({
      where: { ownerId: userId },
      select: { id: true },
    })).map((room) => room.id);

    let ownedRoomAttachmentIds: string[] = [];
    if (ownedRoomIds.length > 0) {
      const ownedRoomAttachments = await tx.attachment.findMany({
        where: {
          messages: {
            some: {
              message: {
                chat: {
                  roomId: { in: ownedRoomIds },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      ownedRoomAttachmentIds = ownedRoomAttachments.map((attachment) => attachment.id);
    }

    await tx.roomMember.deleteMany({
      where: {
        userId,
        room: { ownerId: { not: userId } },
      },
    });

    if (ownedRoomIds.length > 0) {
      await tx.room.deleteMany({ where: { id: { in: ownedRoomIds } } });
    }

    const orphanedAttachments = ownedRoomAttachmentIds.length > 0
      ? await tx.attachment.findMany({
        where: {
          id: { in: ownedRoomAttachmentIds },
          messages: { none: {} },
        },
        select: { id: true, storagePath: true },
      })
      : [];

    if (orphanedAttachments.length > 0) {
      await tx.attachment.deleteMany({
        where: { id: { in: orphanedAttachments.map((attachment) => attachment.id) } },
      });
    }

    await tx.userSession.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt,
        email: deletedEmail,
        username: deletedUsername,
      },
    });

    return orphanedAttachments.map((attachment) => attachment.storagePath);
  });

  await Promise.all(filesToDelete.map(async (storagePath) => {
    const filePath = path.resolve(config.uploadsDir, storagePath);
    const uploadsDir = path.resolve(config.uploadsDir);
    if (!filePath.startsWith(`${uploadsDir}${path.sep}`)) return;
    await fs.unlink(filePath).catch(() => {});
  }));
}
