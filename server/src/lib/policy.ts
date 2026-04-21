import { PrismaClient } from '@prisma/client';

export async function canSendMessage(
  userId: string,
  chatId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      room: {
        include: {
          members: { where: { userId } },
          bans: { where: { userId } },
        },
      },
      participants: true,
    },
  });

  if (!chat) return false;

  if (chat.type === 'room' && chat.room) {
    const isMember = chat.room.members.length > 0;
    const isBanned = chat.room.bans.length > 0;
    return isMember && !isBanned;
  }

  if (chat.type === 'personal') {
    const participantIds = chat.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) return false;
    if (participantIds.length < 2) return false;

    const otherUserId = participantIds.find((id) => id !== userId);
    if (!otherUserId) return false;

    const [userA, userB] = [userId, otherUserId].sort();
    const friendship = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: userA, userBId: userB } },
    });
    if (!friendship) return false;

    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });
    if (block) return false;

    return true;
  }

  return false;
}

export async function canDeleteMessage(
  userId: string,
  messageId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      chat: { include: { room: { include: { admins: true } } } },
    },
  });

  if (!message) return false;
  if (message.authorId === userId) return true;

  if (message.chat.room) {
    const isAdmin = message.chat.room.admins.some((a) => a.userId === userId);
    const isOwner = message.chat.room.ownerId === userId;
    return isAdmin || isOwner;
  }

  return false;
}

export async function canEditMessage(
  userId: string,
  messageId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) return false;
  if (message.authorId !== userId) return false;
  if (message.deletedAt !== null) return false;

  return true;
}

export async function isRoomAdmin(
  userId: string,
  roomId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { admins: { where: { userId } } },
  });

  if (!room) return false;
  if (room.ownerId === userId) return true;
  return room.admins.length > 0;
}

export async function isRoomOwner(
  userId: string,
  roomId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return false;
  return room.ownerId === userId;
}

export async function canAccessAttachment(
  userId: string,
  attachmentId: string,
  prisma: PrismaClient
): Promise<boolean> {
  const msgAttachments = await prisma.messageAttachment.findMany({
    where: { attachmentId },
    include: {
      message: {
        include: {
          chat: {
            include: {
              participants: { where: { userId } },
              room: { include: { members: { where: { userId } } } },
            },
          },
        },
      },
    },
  });

  for (const ma of msgAttachments) {
    const chat = ma.message.chat;
    if (chat.type === 'personal' && chat.participants.length > 0) return true;
    if (chat.type === 'room' && chat.room && chat.room.members.length > 0) return true;
  }

  return false;
}

export async function canViewRoomBans(
  userId: string,
  roomId: string,
  prisma: PrismaClient
): Promise<boolean> {
  return isRoomAdmin(userId, roomId, prisma);
}
