"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canSendMessage = canSendMessage;
exports.canDeleteMessage = canDeleteMessage;
exports.canEditMessage = canEditMessage;
exports.isRoomAdmin = isRoomAdmin;
exports.isRoomOwner = isRoomOwner;
exports.canAccessAttachment = canAccessAttachment;
exports.canViewRoomBans = canViewRoomBans;
async function canSendMessage(userId, chatId, prisma) {
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
    if (!chat)
        return false;
    if (chat.type === 'room' && chat.room) {
        const isMember = chat.room.members.length > 0;
        const isBanned = chat.room.bans.length > 0;
        return isMember && !isBanned;
    }
    if (chat.type === 'personal') {
        const participantIds = chat.participants.map((p) => p.userId);
        if (!participantIds.includes(userId))
            return false;
        if (participantIds.length < 2)
            return false;
        const otherUserId = participantIds.find((id) => id !== userId);
        if (!otherUserId)
            return false;
        const [userA, userB] = [userId, otherUserId].sort();
        const friendship = await prisma.friendship.findUnique({
            where: { userAId_userBId: { userAId: userA, userBId: userB } },
        });
        if (!friendship)
            return false;
        const block = await prisma.userBlock.findFirst({
            where: {
                OR: [
                    { blockerId: userId, blockedId: otherUserId },
                    { blockerId: otherUserId, blockedId: userId },
                ],
            },
        });
        if (block)
            return false;
        return true;
    }
    return false;
}
async function canDeleteMessage(userId, messageId, prisma) {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            chat: { include: { room: { include: { admins: true } } } },
        },
    });
    if (!message)
        return false;
    if (message.authorId === userId)
        return true;
    if (message.chat.room) {
        const isAdmin = message.chat.room.admins.some((a) => a.userId === userId);
        const isOwner = message.chat.room.ownerId === userId;
        return isAdmin || isOwner;
    }
    return false;
}
async function canEditMessage(userId, messageId, prisma) {
    const message = await prisma.message.findUnique({
        where: { id: messageId },
    });
    if (!message)
        return false;
    if (message.authorId !== userId)
        return false;
    if (message.deletedAt !== null)
        return false;
    return true;
}
async function isRoomAdmin(userId, roomId, prisma) {
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { admins: { where: { userId } } },
    });
    if (!room)
        return false;
    if (room.ownerId === userId)
        return true;
    return room.admins.length > 0;
}
async function isRoomOwner(userId, roomId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room)
        return false;
    return room.ownerId === userId;
}
async function canAccessAttachment(userId, attachmentId, prisma) {
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
        if (chat.type === 'personal' && chat.participants.length > 0)
            return true;
        if (chat.type === 'room' && chat.room && chat.room.members.length > 0)
            return true;
    }
    return false;
}
async function canViewRoomBans(userId, roomId, prisma) {
    return isRoomAdmin(userId, roomId, prisma);
}
