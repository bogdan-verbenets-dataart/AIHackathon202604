"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoomSchema = exports.createRoomSchema = void 0;
exports.createRoom = createRoom;
exports.listPublicRooms = listPublicRooms;
exports.getRoomById = getRoomById;
exports.updateRoom = updateRoom;
exports.deleteRoom = deleteRoom;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.getRoomMembers = getRoomMembers;
exports.banUser = banUser;
exports.unbanUser = unbanUser;
exports.getRoomBans = getRoomBans;
exports.inviteUser = inviteUser;
exports.addAdmin = addAdmin;
exports.removeAdmin = removeAdmin;
const zod_1 = require("zod");
const presence_1 = require("../../socket/presence");
exports.createRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).default(''),
    isPublic: zod_1.z.boolean().default(true),
});
exports.updateRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    isPublic: zod_1.z.boolean().optional(),
});
async function createRoom(userId, data, prisma) {
    const existing = await prisma.room.findUnique({ where: { name: data.name } });
    if (existing)
        throw Object.assign(new Error('Room name already taken'), { status: 409 });
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
async function listPublicRooms(prisma) {
    const rooms = await prisma.room.findMany({
        where: { isPublic: true, deletedAt: null },
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
async function getRoomById(roomId, prisma) {
    const room = await prisma.room.findUnique({
        where: { id: roomId, deletedAt: null },
        include: { _count: { select: { members: true } } },
    });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    return { ...room, memberCount: room._count.members };
}
async function updateRoom(userId, roomId, data, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.ownerId !== userId)
        throw Object.assign(new Error('Forbidden'), { status: 403 });
    return prisma.room.update({ where: { id: roomId }, data });
}
async function deleteRoom(userId, roomId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.ownerId !== userId)
        throw Object.assign(new Error('Forbidden'), { status: 403 });
    await prisma.room.update({ where: { id: roomId }, data: { deletedAt: new Date() } });
}
async function joinRoom(userId, roomId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    const ban = await prisma.roomBan.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });
    if (ban)
        throw Object.assign(new Error('You are banned from this room'), { status: 403 });
    if (!room.isPublic) {
        const invite = await prisma.roomInvite.findUnique({
            where: { roomId_inviteeId: { roomId, inviteeId: userId } },
        });
        if (!invite)
            throw Object.assign(new Error('Room is private and you have no invite'), { status: 403 });
    }
    const existing = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });
    if (existing)
        throw Object.assign(new Error('Already a member'), { status: 409 });
    await prisma.roomMember.create({ data: { roomId, userId } });
}
async function leaveRoom(userId, roomId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.ownerId === userId)
        throw Object.assign(new Error('Owner cannot leave; delete the room instead'), { status: 403 });
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });
    if (!member)
        throw Object.assign(new Error('Not a member'), { status: 404 });
    await prisma.roomMember.delete({ where: { id: member.id } });
}
async function getRoomMembers(roomId, redisClient, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    const members = await prisma.roomMember.findMany({
        where: { roomId },
        include: { user: { select: { id: true, username: true, email: true } } },
    });
    const admins = await prisma.roomAdmin.findMany({ where: { roomId }, select: { userId: true } });
    const adminSet = new Set(admins.map((a) => a.userId));
    return Promise.all(members.map(async (m) => {
        const role = m.userId === room.ownerId ? 'owner' : adminSet.has(m.userId) ? 'admin' : 'member';
        const status = await (0, presence_1.getUserStatus)(m.userId, redisClient);
        return { ...m.user, role, status, joinedAt: m.joinedAt };
    }));
}
async function banUser(actorId, roomId, targetUserId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (actorId !== room.ownerId) {
        const isAdmin = await prisma.roomAdmin.findUnique({
            where: { roomId_userId: { roomId, userId: actorId } },
        });
        if (!isAdmin)
            throw Object.assign(new Error('Forbidden'), { status: 403 });
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
async function unbanUser(actorId, roomId, targetUserId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (actorId !== room.ownerId) {
        const isAdmin = await prisma.roomAdmin.findUnique({
            where: { roomId_userId: { roomId, userId: actorId } },
        });
        if (!isAdmin)
            throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
    await prisma.roomBan.delete({ where: { roomId_userId: { roomId, userId: targetUserId } } }).catch(() => { });
}
async function getRoomBans(roomId, prisma) {
    return prisma.roomBan.findMany({
        where: { roomId },
        include: {
            user: { select: { id: true, username: true, email: true } },
            bannedBy: { select: { id: true, username: true } },
        },
    });
}
async function inviteUser(actorId, roomId, inviteeId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    // Check actor is member
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId: actorId } },
    });
    if (!member)
        throw Object.assign(new Error('Not a member'), { status: 403 });
    await prisma.roomInvite.upsert({
        where: { roomId_inviteeId: { roomId, inviteeId } },
        create: { roomId, inviterId: actorId, inviteeId },
        update: { inviterId: actorId },
    });
}
async function addAdmin(ownerId, roomId, targetUserId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.ownerId !== ownerId)
        throw Object.assign(new Error('Forbidden'), { status: 403 });
    await prisma.roomAdmin.upsert({
        where: { roomId_userId: { roomId, userId: targetUserId } },
        create: { roomId, userId: targetUserId },
        update: {},
    });
}
async function removeAdmin(ownerId, roomId, targetUserId, prisma) {
    const room = await prisma.room.findUnique({ where: { id: roomId, deletedAt: null } });
    if (!room)
        throw Object.assign(new Error('Room not found'), { status: 404 });
    if (room.ownerId !== ownerId)
        throw Object.assign(new Error('Forbidden'), { status: 403 });
    await prisma.roomAdmin.delete({
        where: { roomId_userId: { roomId, userId: targetUserId } },
    }).catch(() => { });
}
