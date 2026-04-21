"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = searchUsers;
exports.getUserById = getUserById;
async function searchUsers(query, currentUserId, prisma) {
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
async function getUserById(id, prisma) {
    const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        select: { id: true, username: true, email: true, createdAt: true },
    });
    if (!user)
        throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
}
