"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
const socket_io_1 = require("socket.io");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const presence_1 = require("./presence");
function setupSocket(server, prisma, redisClient) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
        },
    });
    // Separate Redis connection for pub/sub
    const redisSub = redisClient.duplicate();
    // Track socket -> {userId, tabId} mapping
    const socketUserMap = new Map();
    redisSub.subscribe('presence:updates', (err) => {
        if (err)
            console.error('Redis subscribe error:', err);
    });
    redisSub.on('message', (_channel, message) => {
        try {
            const data = JSON.parse(message);
            io.emit('presence:update', data);
        }
        catch {
            // ignore parse errors
        }
    });
    io.on('connection', (socket) => {
        socket.on('auth', async (payload) => {
            try {
                const { token, tabId } = payload;
                if (!token || !tabId) {
                    socket.emit('auth:error', { error: 'token and tabId required' });
                    return;
                }
                let jwtPayload;
                try {
                    jwtPayload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
                }
                catch {
                    socket.emit('auth:error', { error: 'Invalid token' });
                    return;
                }
                const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
                const session = await prisma.userSession.findUnique({
                    where: { id: jwtPayload.sessionId },
                    include: { user: true },
                });
                if (!session || session.tokenHash !== tokenHash || session.expiresAt < new Date()) {
                    socket.emit('auth:error', { error: 'Invalid session' });
                    return;
                }
                const userId = session.user.id;
                socketUserMap.set(socket.id, { userId, tabId });
                const prevStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
                await (0, presence_1.setTabActive)(userId, tabId, redisClient);
                const newStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
                if (prevStatus !== newStatus) {
                    await (0, presence_1.publishPresenceChange)(userId, newStatus, redisClient);
                }
                socket.emit('auth:success', { userId });
            }
            catch (err) {
                console.error('Socket auth error:', err);
                socket.emit('auth:error', { error: 'Internal error' });
            }
        });
        socket.on('join_chat', (chatId) => {
            socket.join(`chat:${chatId}`);
        });
        socket.on('leave_chat', (chatId) => {
            socket.leave(`chat:${chatId}`);
        });
        socket.on('heartbeat', async (data) => {
            const info = socketUserMap.get(socket.id);
            if (!info)
                return;
            const { userId } = info;
            const tabId = data?.tabId ?? info.tabId;
            const prevStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            await (0, presence_1.setTabActive)(userId, tabId, redisClient);
            const newStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            if (prevStatus !== newStatus) {
                await (0, presence_1.publishPresenceChange)(userId, newStatus, redisClient);
            }
        });
        socket.on('afk', async (data) => {
            const info = socketUserMap.get(socket.id);
            if (!info)
                return;
            const { userId } = info;
            const tabId = data?.tabId ?? info.tabId;
            const prevStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            await (0, presence_1.setTabAfk)(userId, tabId, redisClient);
            const newStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            if (prevStatus !== newStatus) {
                await (0, presence_1.publishPresenceChange)(userId, newStatus, redisClient);
            }
        });
        socket.on('active', async (data) => {
            const info = socketUserMap.get(socket.id);
            if (!info)
                return;
            const { userId } = info;
            const tabId = data?.tabId ?? info.tabId;
            const prevStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            await (0, presence_1.setTabActive)(userId, tabId, redisClient);
            const newStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            if (prevStatus !== newStatus) {
                await (0, presence_1.publishPresenceChange)(userId, newStatus, redisClient);
            }
        });
        socket.on('disconnect', async () => {
            const info = socketUserMap.get(socket.id);
            if (!info)
                return;
            const { userId, tabId } = info;
            socketUserMap.delete(socket.id);
            const prevStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            await (0, presence_1.removeTab)(userId, tabId, redisClient);
            const newStatus = await (0, presence_1.getUserStatus)(userId, redisClient);
            if (prevStatus !== newStatus) {
                await (0, presence_1.publishPresenceChange)(userId, newStatus, redisClient);
            }
        });
    });
    return io;
}
