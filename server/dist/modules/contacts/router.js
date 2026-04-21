"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const redis_1 = __importDefault(require("../../redis"));
const auth_1 = require("../../middleware/auth");
const service_1 = require("./service");
const router = (0, express_1.Router)();
router.get('/friends', auth_1.authenticate, async (req, res) => {
    try {
        const friends = await (0, service_1.listFriends)(req.user.id, redis_1.default, db_1.default);
        res.json({ data: friends });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/friends/requests', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.sendFriendRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const request = await (0, service_1.sendFriendRequest)(req.user.id, parsed.data, db_1.default);
        res.status(201).json({ data: request });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/friends/requests', auth_1.authenticate, async (req, res) => {
    try {
        const requests = await (0, service_1.listIncomingRequests)(req.user.id, db_1.default);
        res.json({ data: requests });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/friends/requests/:id', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.respondFriendRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        await (0, service_1.respondToRequest)(req.user.id, req.params.id, parsed.data.action, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.delete('/friends/:id', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.removeFriend)(req.user.id, req.params.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/blocks', auth_1.authenticate, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        await (0, service_1.blockUser)(req.user.id, userId, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.delete('/blocks/:id', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.unblockUser)(req.user.id, req.params.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/blocks', auth_1.authenticate, async (req, res) => {
    try {
        const blocks = await (0, service_1.listBlocks)(req.user.id, db_1.default);
        res.json({ data: blocks });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/:userId/chat', auth_1.authenticate, async (req, res) => {
    try {
        const chat = await (0, service_1.getOrCreatePersonalChat)(req.user.id, req.params.userId, db_1.default);
        res.json({ data: chat });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
exports.default = router;
