"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const auth_1 = require("../../middleware/auth");
const service_1 = require("./service");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const parsed = service_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const user = await (0, service_1.registerUser)(parsed.data, db_1.default);
        res.status(201).json({ data: user });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const parsed = service_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const result = await (0, service_1.loginUser)(parsed.data, req.headers['user-agent'], req.ip, db_1.default);
        res.cookie('token', result.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        res.json({ data: { user: result.user, session: result.session } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/logout', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.logoutUser)(req.session.id, db_1.default);
        res.clearCookie('token');
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/forgot-password', async (req, res) => {
    try {
        const parsed = service_1.forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const result = await (0, service_1.forgotPassword)(parsed.data.email, db_1.default);
        res.json({ data: result });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const parsed = service_1.resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        await (0, service_1.resetPassword)(parsed.data, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        await (0, service_1.changePassword)(req.user.id, parsed.data, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/me', auth_1.authenticate, async (req, res) => {
    res.json({ data: req.user });
});
exports.default = router;
