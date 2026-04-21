"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesRouter = exports.chatsRouter = void 0;
exports.setIo = setIo;
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const auth_1 = require("../../middleware/auth");
const service_1 = require("./service");
// io is set after socket setup
let ioInstance = null;
function setIo(io) {
    ioInstance = io;
}
const chatsRouter = (0, express_1.Router)();
exports.chatsRouter = chatsRouter;
const messagesRouter = (0, express_1.Router)();
exports.messagesRouter = messagesRouter;
chatsRouter.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const chats = await (0, service_1.listChats)(req.user.id, db_1.default);
        res.json({ data: chats });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
chatsRouter.get('/:chatId/messages', auth_1.authenticate, async (req, res) => {
    try {
        const before = req.query.before;
        const limit = parseInt(req.query.limit ?? '50', 10);
        const messages = await (0, service_1.getMessages)(req.params.chatId, req.user.id, before, limit, db_1.default);
        res.json({ data: messages });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
chatsRouter.post('/:chatId/messages', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const msg = await (0, service_1.sendMessage)(req.params.chatId, req.user.id, parsed.data, ioInstance, db_1.default);
        res.status(201).json({ data: msg });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
chatsRouter.post('/:chatId/read', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.markChatRead)(req.params.chatId, req.user.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
messagesRouter.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const parsed = service_1.editMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation error' });
            return;
        }
        const msg = await (0, service_1.editMessage)(req.params.id, req.user.id, parsed.data, ioInstance, db_1.default);
        res.json({ data: msg });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
messagesRouter.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.deleteMessage)(req.params.id, req.user.id, ioInstance, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
