import { PrismaClient } from '@prisma/client';

export async function searchUsers(query: string, currentUserId: string, prisma: PrismaClient) {
  return prisma.user.findMany({
    where: {
      username: { startsWith: query, mode: 'insensitive' },
      id: { not: currentUserId },
      deletedAt: null,
    },
    select: { id: true, username: true, email: true, createdAt: true },
    take: 20,
  });
}

export async function getUserById(id: string, prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, username: true, email: true, createdAt: true },
  });
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return user;
}
