import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { Server as SocketServer } from 'socket.io';
import { canSendMessage, canDeleteMessage, canEditMessage } from '../../lib/policy';

const MAX_MESSAGE_BYTES = 3 * 1024;
const isValidMessageSize = (content: string) => Buffer.byteLength(content, 'utf8') <= MAX_MESSAGE_BYTES;

export const sendMessageSchema = z.object({
  content: z.string().min(1).refine(isValidMessageSize, 'Message text must be 3 KB or less'),
  replyToId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).refine(isValidMessageSize, 'Message text must be 3 KB or less'),
});

function formatMessage(msg: {
  id: string;
  chatId: string;
  authorId: string;
  content: string;
  replyToId: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  author: { id: string; username: string; email: string };
  attachments: Array<{ attachment: { id: string; originalName: string; mimeType: string; size: number } }>;
}) {
  if (msg.deletedAt) {
    return {
      id: msg.id,
      chatId: msg.chatId,
      deleted: true,
      createdAt: msg.createdAt,
    };
  }
  return {
    id: msg.id,
    chatId: msg.chatId,
    content: msg.content,
    authorId: msg.authorId,
    author: msg.author,
    replyToId: msg.replyToId,
    editedAt: msg.editedAt,
    createdAt: msg.createdAt,
    attachments: msg.attachments.map((a) => a.attachment),
    deleted: false,
  };
}

export async function getMessages(
  chatId: string,
  userId: string,
  before: string | undefined,
  limit: number,
  prisma: PrismaClient
) {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat) throw Object.assign(new Error('Chat not found'), { status: 404 });

  const clampedLimit = Math.min(Math.max(limit, 1), 100);

  let cursor = {};
  if (before) {
    const ref = await prisma.message.findUnique({ where: { id: before } });
    if (ref) {
      cursor = { cursor: { id: before }, skip: 1 };
    }
  }

  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: clampedLimit,
    ...cursor,
    include: {
      author: { select: { id: true, username: true, email: true } },
      attachments: { include: { attachment: true } },
    },
  });

  return messages.map(formatMessage);
}

export async function sendMessage(
  chatId: string,
  userId: string,
  data: z.infer<typeof sendMessageSchema>,
  io: SocketServer | null,
  prisma: PrismaClient
) {
  const allowed = await canSendMessage(userId, chatId, prisma);
  if (!allowed) throw Object.assign(new Error('Cannot send message to this chat'), { status: 403 });

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        chatId,
        authorId: userId,
        content: data.content,
        replyToId: data.replyToId ?? null,
      },
      include: {
        author: { select: { id: true, username: true, email: true } },
        attachments: { include: { attachment: true } },
      },
    });

    if (data.attachmentIds && data.attachmentIds.length > 0) {
      await tx.messageAttachment.createMany({
        data: data.attachmentIds.map((attachmentId) => ({
          messageId: msg.id,
          attachmentId,
        })),
        skipDuplicates: true,
      });
    }

    // Increment unread for all chat participants except sender
    const chat = await tx.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: true,
        room: { include: { members: true } },
      },
    });

    const otherUserIds: string[] = [];
    if (chat?.type === 'personal') {
      otherUserIds.push(...chat.participants.map((p) => p.userId).filter((id) => id !== userId));
    } else if (chat?.type === 'room' && chat.room) {
      otherUserIds.push(...chat.room.members.map((m) => m.userId).filter((id) => id !== userId));
    }

    for (const uid of otherUserIds) {
      await tx.unreadState.upsert({
        where: { userId_chatId: { userId: uid, chatId } },
        create: { userId: uid, chatId, count: 1 },
        update: { count: { increment: 1 } },
      });
    }

    return msg;
  });

  // Refetch with attachments
  const fullMessage = await prisma.message.findUnique({
    where: { id: message.id },
    include: {
      author: { select: { id: true, username: true, email: true } },
      attachments: { include: { attachment: true } },
    },
  });

  if (io && fullMessage) {
    io.to(`chat:${chatId}`).emit('message:new', formatMessage(fullMessage));
  }

  return fullMessage ? formatMessage(fullMessage) : null;
}

export async function editMessage(
  messageId: string,
  userId: string,
  data: z.infer<typeof editMessageSchema>,
  io: SocketServer | null,
  prisma: PrismaClient
) {
  const allowed = await canEditMessage(userId, messageId, prisma);
  if (!allowed) throw Object.assign(new Error('Cannot edit this message'), { status: 403 });

  const msg = await prisma.message.update({
    where: { id: messageId },
    data: { content: data.content, editedAt: new Date() },
    include: {
      author: { select: { id: true, username: true, email: true } },
      attachments: { include: { attachment: true } },
    },
  });

  if (io) {
    io.to(`chat:${msg.chatId}`).emit('message:edit', formatMessage(msg));
  }

  return formatMessage(msg);
}

export async function deleteMessage(
  messageId: string,
  userId: string,
  io: SocketServer | null,
  prisma: PrismaClient
) {
  const allowed = await canDeleteMessage(userId, messageId, prisma);
  if (!allowed) throw Object.assign(new Error('Cannot delete this message'), { status: 403 });

  const msg = await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  if (io) {
    io.to(`chat:${msg.chatId}`).emit('message:delete', { id: msg.id, chatId: msg.chatId });
  }
}

export async function markChatRead(chatId: string, userId: string, prisma: PrismaClient) {
  await prisma.unreadState.upsert({
    where: { userId_chatId: { userId, chatId } },
    create: { userId, chatId, count: 0, lastReadAt: new Date() },
    update: { count: 0, lastReadAt: new Date() },
  });
}

export async function listChats(userId: string, prisma: PrismaClient) {
  // Personal chats
  const personalParticipants = await prisma.personalChatParticipant.findMany({
    where: { userId },
    include: {
      chat: {
        include: {
          participants: { include: { chat: false } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { author: { select: { id: true, username: true } } },
          },
          unread: { where: { userId } },
        },
      },
    },
  });

  // Room chats
  const roomMembers = await prisma.roomMember.findMany({
    where: { userId, room: { deletedAt: null } },
    include: {
      room: {
        include: {
          chat: {
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { author: { select: { id: true, username: true } } },
              },
              unread: { where: { userId } },
            },
          },
        },
      },
    },
  });

  const personalOtherUserIds = [
    ...new Set(
      personalParticipants.flatMap((p) =>
        p.chat.participants
          .map((pp) => pp.userId)
          .filter((participantId) => participantId !== userId)
      )
    ),
  ];
  const personalUsers = personalOtherUserIds.length > 0
    ? await prisma.user.findMany({
      where: { id: { in: personalOtherUserIds } },
      select: { id: true, username: true },
    })
    : [];
  const personalUsernames = new Map(personalUsers.map((u) => [u.id, u.username]));

  const result = [];

  for (const p of personalParticipants) {
    const chat = p.chat;
    const otherParticipant = chat.participants.find((pp) => pp.userId !== userId);
    result.push({
      id: chat.id,
      type: 'personal',
      name: otherParticipant ? personalUsernames.get(otherParticipant.userId) ?? 'Unknown user' : 'Unknown user',
      lastMessage: chat.messages[0] ?? null,
      unread: chat.unread[0]?.count ?? 0,
    });
  }

  for (const m of roomMembers) {
    const room = m.room;
    if (!room || !room.chat) continue;
    const chat = room.chat;
    result.push({
      id: chat.id,
      type: 'room',
      roomId: room.id,
      name: room.name,
      lastMessage: chat.messages[0] ?? null,
      unread: chat.unread[0]?.count ?? 0,
    });
  }

  return result;
}
