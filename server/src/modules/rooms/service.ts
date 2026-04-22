import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Redis from 'ioredis';
import { getUserStatus } from '../../socket/presence';

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  isPublic: z.boolean().default(true),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export async function createRoom(
  userId: string,
  data: z.infer<typeof createRoomSchema>,
  prisma: PrismaClient
) {
  const existing = await prisma.room.findUnique({ where: { name: data.name } });
  if (existing) throw Object.assign(new Error('Room name already taken'), { status: 409 });

  const room = await prisma.$transaction(async (tx) => {
    const r = await tx.room.create({
      data: { ...data, ownerId: userId },
    });
    await tx.chat.create({ data: { type: 'room', roomId: r.id } });
    await tx.roomMember.create({ data: { roomId: r.id, userId } });
    return r;
  });

  return room;
}

export async function listPublicRooms(prisma: PrismaClient, q?: string) {
  const query = q?.trim();
  const rooms = await prisma.room.findMany({
    where: {
      isPublic: true,
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isPublic: r.isPublic,
    ownerId: r.ownerId,
    createdAt: r.createdAt,
    memberCount: r._count.members,
  }));
}

export async function getRoomById(roomId: string, prisma: PrismaClient) {
  const room = await prisma.room.findUnique({
    where: { id: roomId, deletedAt: null },
    include: { _count: { select: { members: true } } },
  });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  return { ...room, memberCount: room._count.members };
}

export async function updateRoom(
  userId: string,
  roomId: string,
  data: z.infer<typeof updateRoomSchema>,
  prisma: PrismaClient
) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.ownerId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return prisma.room.update({ where: { id: roomId }, data });
}

export async function deleteRoom(userId: string, roomId: string, prisma: PrismaClient) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.ownerId !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  await prisma.room.update({ where: { id: roomId }, data: { deletedAt: new Date() } });
}

export async function joinRoom(userId: string, roomId: string, prisma: PrismaClient) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  const ban = await prisma.roomBan.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (ban) throw Object.assign(new Error('You are banned from this room'), { status: 403 });

  if (!room.isPublic) {
    const invite = await prisma.roomInvite.findUnique({
      where: { roomId_inviteeId: { roomId, inviteeId: userId } },
    });
    if (!invite) throw Object.assign(new Error('Room is private and you have no invite'), { status: 403 });
  }

  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (existing) throw Object.assign(new Error('Already a member'), { status: 409 });

  await prisma.roomMember.create({ data: { roomId, userId } });
}

export async function leaveRoom(userId: string, roomId: string, prisma: PrismaClient) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.ownerId === userId) throw Object.assign(new Error('Owner cannot leave; delete the room instead'), { status: 403 });

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) throw Object.assign(new Error('Not a member'), { status: 404 });

  await prisma.roomMember.delete({ where: { id: member.id } });
}

export async function getRoomMembers(roomId: string, redisClient: Redis, prisma: PrismaClient) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: { user: { select: { id: true, username: true, email: true } } },
  });

  const admins = await prisma.roomAdmin.findMany({ where: { roomId }, select: { userId: true } });
  const adminSet = new Set(admins.map((a) => a.userId));

  return Promise.all(
    members.map(async (m) => {
      const role = m.userId === room.ownerId ? 'owner' : adminSet.has(m.userId) ? 'admin' : 'member';
      const presence = await getUserStatus(m.userId, redisClient);
      return { ...m.user, role, presence, joinedAt: m.joinedAt };
    })
  );
}

export async function banUser(
  actorId: string,
  roomId: string,
  targetUserId: string,
  prisma: PrismaClient
) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  if (actorId !== room.ownerId) {
    const isAdmin = await prisma.roomAdmin.findUnique({
      where: { roomId_userId: { roomId, userId: actorId } },
    });
    if (!isAdmin) throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  await prisma.$transaction([
    prisma.roomBan.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      create: { roomId, userId: targetUserId, bannedById: actorId },
      update: { bannedById: actorId },
    }),
    prisma.roomMember.deleteMany({ where: { roomId, userId: targetUserId } }),
  ]);
}

export async function unbanUser(
  actorId: string,
  roomId: string,
  targetUserId: string,
  prisma: PrismaClient
) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  if (actorId !== room.ownerId) {
    const isAdmin = await prisma.roomAdmin.findUnique({
      where: { roomId_userId: { roomId, userId: actorId } },
    });
    if (!isAdmin) throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  await prisma.roomBan.delete({ where: { roomId_userId: { roomId, userId: targetUserId } } }).catch(() => {});
}

export async function getRoomBans(roomId: string, prisma: PrismaClient) {
  return prisma.roomBan.findMany({
    where: { roomId },
    include: {
      user: { select: { id: true, username: true, email: true } },
      bannedBy: { select: { id: true, username: true } },
    },
  });
}

export async function inviteUser(
  actorId: string,
  roomId: string,
  inviteeId: string,
  prisma: PrismaClient
) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

  // Check actor is member
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: actorId } },
  });
  if (!member) throw Object.assign(new Error('Not a member'), { status: 403 });

  await prisma.roomInvite.upsert({
    where: { roomId_inviteeId: { roomId, inviteeId } },
    create: { roomId, inviterId: actorId, inviteeId },
    update: { inviterId: actorId },
  });
}

export async function addAdmin(
  ownerId: string,
  roomId: string,
  targetUserId: string,
  prisma: PrismaClient
) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.ownerId !== ownerId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  await prisma.roomAdmin.upsert({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    create: { roomId, userId: targetUserId },
    update: {},
  });
}

export async function removeAdmin(
  ownerId: string,
  roomId: string,
  targetUserId: string,
  prisma: PrismaClient
) {
  const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
  if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
  if (room.ownerId !== ownerId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  await prisma.roomAdmin.delete({
    where: { roomId_userId: { roomId, userId: targetUserId } },
  }).catch(() => {});
}
