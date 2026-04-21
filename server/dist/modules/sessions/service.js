"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSessions = listSessions;
exports.invalidateSession = invalidateSession;
async function listSessions(userId, prisma) {
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
async function invalidateSession(sessionId, userId, prisma) {
    const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
        throw Object.assign(new Error('Session not found'), { status: 404 });
    }
    await prisma.userSession.delete({ where: { id: sessionId } });
}
