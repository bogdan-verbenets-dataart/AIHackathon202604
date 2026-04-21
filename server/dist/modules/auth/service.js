"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
exports.hashToken = hashToken;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.logoutUser = logoutUser;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.changePassword = changePassword;
const crypto_1 = __importDefault(require("crypto"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const config_1 = require("../../config");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().regex(/^[a-zA-Z0-9_]{3,30}$/),
    password: zod_1.z.string().min(8),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    password: zod_1.z.string().min(8),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function registerUser(data, prisma) {
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
        throw Object.assign(new Error('Email or username already taken'), { status: 409 });
    }
    const passwordHash = await bcrypt_1.default.hash(data.password, 12);
    const user = await prisma.user.create({
        data: { email: data.email, username: data.username, passwordHash },
        select: { id: true, email: true, username: true, createdAt: true },
    });
    return user;
}
async function loginUser(data, userAgent, ipAddress, prisma) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !await bcrypt_1.default.compare(data.password, user.passwordHash)) {
        throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // Create a placeholder session to get the ID, then sign JWT, then update tokenHash
    const session = await prisma.userSession.create({
        data: {
            userId: user.id,
            tokenHash: 'placeholder',
            userAgent: userAgent ?? null,
            ipAddress: ipAddress ?? null,
            expiresAt,
        },
    });
    const token = jsonwebtoken_1.default.sign({ sessionId: session.id }, config_1.config.jwtSecret, {
        algorithm: 'HS256',
        expiresIn: '30d',
    });
    const tokenHash = hashToken(token);
    await prisma.userSession.update({ where: { id: session.id }, data: { tokenHash } });
    return {
        token,
        user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
        session: { id: session.id },
    };
}
async function logoutUser(sessionId, prisma) {
    await prisma.userSession.delete({ where: { id: sessionId } }).catch(() => { });
}
async function forgotPassword(email, prisma) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Don't reveal if user exists
        return { token: null };
    }
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
    });
    return { token: rawToken };
}
async function resetPassword(data, prisma) {
    const tokenHash = hashToken(data.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw Object.assign(new Error('Invalid or expired reset token'), { status: 400 });
    }
    const passwordHash = await bcrypt_1.default.hash(data.password, 12);
    await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
}
async function changePassword(userId, data, prisma) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw Object.assign(new Error('User not found'), { status: 404 });
    const valid = await bcrypt_1.default.compare(data.oldPassword, user.passwordHash);
    if (!valid)
        throw Object.assign(new Error('Old password incorrect'), { status: 400 });
    const passwordHash = await bcrypt_1.default.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
