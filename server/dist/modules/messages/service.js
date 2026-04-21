"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editMessageSchema = exports.sendMessageSchema = void 0;
exports.getMessages = getMessages;
exports.sendMessage = sendMessage;
exports.editMessage = editMessage;
exports.deleteMessage = deleteMessage;
exports.markChatRead = markChatRead;
exports.listChats = listChats;
const zod_1 = require("zod");
const policy_1 = require("../../lib/policy");
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(10000),
    replyToId: zod_1.z.string().uuid().optional(),
    attachmentIds: zod_1.z.array(zod_1.z.string().uuid()).max(10).optional(),
});
exports.editMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(10000),
});
function formatMessage(msg) {
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
async function getMessages(chatId, userId, before, limit, prisma) {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat)
        throw Object.assign(new Error('Chat not found'), { status: 404 });
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
async function sendMessage(chatId, userId, data, io, prisma) {
    const allowed = await (0, policy_1.canSendMessage)(userId, chatId, prisma);
    if (!allowed)
        throw Object.assign(new Error('Cannot send message to this chat'), { status: 403 });
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
        const otherUserIds = [];
        if (chat?.type === 'personal') {
            otherUserIds.push(...chat.participants.map((p) => p.userId).filter((id) => id !== userId));
        }
        else if (chat?.type === 'room' && chat.room) {
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
async function editMessage(messageId, userId, data, io, prisma) {
    const allowed = await (0, policy_1.canEditMessage)(userId, messageId, prisma);
    if (!allowed)
        throw Object.assign(new Error('Cannot edit this message'), { status: 403 });
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
async function deleteMessage(messageId, userId, io, prisma) {
    const allowed = await (0, policy_1.canDeleteMessage)(userId, messageId, prisma);
    if (!allowed)
        throw Object.assign(new Error('Cannot delete this message'), { status: 403 });
    const msg = await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
    });
    if (io) {
        io.to(`chat:${msg.chatId}`).emit('message:delete', { id: msg.id, chatId: msg.chatId });
    }
}
async function markChatRead(chatId, userId, prisma) {
    await prisma.unreadState.upsert({
        where: { userId_chatId: { userId, chatId } },
        create: { userId, chatId, count: 0, lastReadAt: new Date() },
        update: { count: 0, lastReadAt: new Date() },
    });
}
async function listChats(userId, prisma) {
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
    const result = [];
    for (const p of personalParticipants) {
        const chat = p.chat;
        const otherParticipantIds = chat.participants.map((pp) => pp.userId).filter((id) => id !== userId);
        result.push({
            id: chat.id,
            type: 'personal',
            participantIds: otherParticipantIds,
            lastMessage: chat.messages[0] ?? null,
            unreadCount: chat.unread[0]?.count ?? 0,
        });
    }
    for (const m of roomMembers) {
        const room = m.room;
        if (!room || !room.chat)
            continue;
        const chat = room.chat;
        result.push({
            id: chat.id,
            type: 'room',
            roomId: room.id,
            roomName: room.name,
            lastMessage: chat.messages[0] ?? null,
            unreadCount: chat.unread[0]?.count ?? 0,
        });
    }
    return result;
}
