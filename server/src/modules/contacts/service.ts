import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Redis from 'ioredis';
import { getUserStatus } from '../../socket/presence';

export const sendFriendRequestSchema = z.object({
  recipientId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export const respondFriendRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export async function listFriends(userId: string, redisClient: Redis, prisma: PrismaClient) {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    include: {
      userA: { select: { id: true, username: true, email: true } },
      userB: { select: { id: true, username: true, email: true } },
    },
  });

  return Promise.all(
    friendships.map(async (f) => {
      const friend = f.userAId === userId ? f.userB : f.userA;
      const presence = await getUserStatus(friend.id, redisClient);
      return { ...friend, presence, since: f.createdAt };
    })
  );
}

export async function sendFriendRequest(
  requesterId: string,
  data: z.infer<typeof sendFriendRequestSchema>,
  prisma: PrismaClient
) {
  if (requesterId === data.recipientId) {
    throw Object.assign(new Error('Cannot send friend request to yourself'), { status: 400 });
  }

  // Check not already friends
  const [uA, uB] = [requesterId, data.recipientId].sort();
  const existing = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: uA, userBId: uB } },
  });
  if (existing) throw Object.assign(new Error('Already friends'), { status: 409 });

  // Check for block
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: requesterId, blockedId: data.recipientId },
        { blockerId: data.recipientId, blockedId: requesterId },
      ],
    },
  });
  if (block) throw Object.assign(new Error('Cannot send friend request'), { status: 403 });

  const req = await prisma.friendRequest.upsert({
    where: { requesterId_recipientId: { requesterId, recipientId: data.recipientId } },
    create: { requesterId, recipientId: data.recipientId, message: data.message ?? null },
    update: { status: 'pending', message: data.message ?? null },
  });
  return req;
}

export async function listIncomingRequests(userId: string, prisma: PrismaClient) {
  return prisma.friendRequest.findMany({
    where: { recipientId: userId, status: 'pending' },
    include: { requester: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function respondToRequest(
  userId: string,
  requestId: string,
  action: 'accept' | 'reject',
  prisma: PrismaClient
) {
  const request = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!request || request.recipientId !== userId) {
    throw Object.assign(new Error('Friend request not found'), { status: 404 });
  }

  if (action === 'accept') {
    const [userAId, userBId] = [userId, request.requesterId].sort();
    await prisma.$transaction([
      prisma.friendship.upsert({
        where: { userAId_userBId: { userAId, userBId } },
        create: { userAId, userBId },
        update: {},
      }),
      prisma.friendRequest.delete({ where: { id: requestId } }),
    ]);
  } else {
    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });
  }
}

export async function removeFriend(userId: string, friendId: string, prisma: PrismaClient) {
  const [userAId, userBId] = [userId, friendId].sort();
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (!friendship) throw Object.assign(new Error('Not friends'), { status: 404 });
  await prisma.friendship.delete({ where: { id: friendship.id } });
}

export async function blockUser(blockerId: string, blockedId: string, prisma: PrismaClient) {
  if (blockerId === blockedId) throw Object.assign(new Error('Cannot block yourself'), { status: 400 });
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });
  // Remove friendship if exists
  const [uA, uB] = [blockerId, blockedId].sort();
  await prisma.friendship.deleteMany({ where: { userAId: uA, userBId: uB } });
}

export async function unblockUser(blockerId: string, blockedId: string, prisma: PrismaClient) {
  await prisma.userBlock.delete({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  }).catch(() => {});
}

export async function listBlocks(userId: string, prisma: PrismaClient) {
  return prisma.userBlock.findMany({
    where: { blockerId: userId },
    include: { blocked: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrCreatePersonalChat(
  userId: string,
  targetUserId: string,
  prisma: PrismaClient
) {
  if (userId === targetUserId) {
    throw Object.assign(new Error('Cannot chat with yourself'), { status: 400 });
  }

  // Check friendship
  const [uA, uB] = [userId, targetUserId].sort();
  const friendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: uA, userBId: uB } },
  });
  if (!friendship) throw Object.assign(new Error('Must be friends to start a chat'), { status: 403 });

  // Check no mutual block
  const block = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: userId },
      ],
    },
  });
  if (block) throw Object.assign(new Error('Cannot chat with blocked user'), { status: 403 });

  // Find existing chat with both participants
  const existing = await prisma.personalChatParticipant.findMany({
    where: { userId },
    include: {
      chat: {
        include: { participants: true },
      },
    },
  });

  for (const p of existing) {
    if (
      p.chat.type === 'personal' &&
      p.chat.participants.some((pp) => pp.userId === targetUserId)
    ) {
      return p.chat;
    }
  }

  // Create new chat
  const chat = await prisma.$transaction(async (tx) => {
    const c = await tx.chat.create({ data: { type: 'personal' } });
    await tx.personalChatParticipant.createMany({
      data: [
        { chatId: c.id, userId },
        { chatId: c.id, userId: targetUserId },
      ],
    });
    return c;
  });

  return chat;
}
