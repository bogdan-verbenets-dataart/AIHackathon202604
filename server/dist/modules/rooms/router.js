"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const redis_1 = __importDefault(require("../../redis"));
const auth_1 = require("../../middleware/auth");
const policy_1 = require("../../lib/policy");
const service_1 = require("./service");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, async (_req, res) => {
    try {
        const rooms = await (0, service_1.listPublicRooms)(db_1.default);
        res.json({ data: rooms });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.createRoomSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const room = await (0, service_1.createRoom)(req.user.id, parsed.data, db_1.default);
        res.status(201).json({ data: room });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const room = await (0, service_1.getRoomById)(req.params.id, db_1.default);
        res.json({ data: room });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.updateRoomSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const room = await (0, service_1.updateRoom)(req.user.id, req.params.id, parsed.data, db_1.default);
        res.json({ data: room });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.deleteRoom)(req.user.id, req.params.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/:id/join', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.joinRoom)(req.user.id, req.params.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/:id/leave', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.leaveRoom)(req.user.id, req.params.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/:id/members', auth_1.authenticate, async (req, res) => {
    try {
        const members = await (0, service_1.getRoomMembers)(req.params.id, redis_1.default, db_1.default);
        res.json({ data: members });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/:id/bans/:userId', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.banUser)(req.user.id, req.params.id, req.params.userId, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.delete('/:id/bans/:userId', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.unbanUser)(req.user.id, req.params.id, req.params.userId, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/:id/bans', auth_1.authenticate, async (req, res) => {
    try {
        const allowed = await (0, policy_1.canViewRoomBans)(req.user.id, req.params.id, db_1.default);
        if (!allowed) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const bans = await (0, service_1.getRoomBans)(req.params.id, db_1.default);
        res.json({ data: bans });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/:id/invites/:userId', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.inviteUser)(req.user.id, req.params.id, req.params.userId, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.post('/:id/admins/:userId', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.addAdmin)(req.user.id, req.params.id, req.params.userId, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.delete('/:id/admins/:userId', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.removeAdmin)(req.user.id, req.params.id, req.params.userId, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
exports.default = router;
