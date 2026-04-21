import { PrismaClient } from '@prisma/client';

export async function listSessions(userId: string, prisma: PrismaClient) {
  return prisma.userSession.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  });
}

export async function invalidateSession(
  sessionId: string,
  userId: string,
  prisma: PrismaClient
) {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw Object.assign(new Error('Session not found'), { status: 404 });
  }
  await prisma.userSession.delete({ where: { id: sessionId } });
}
