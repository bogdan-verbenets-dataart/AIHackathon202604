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
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const sessions = await (0, service_1.listSessions)(req.user.id, db_1.default);
        res.json({ data: sessions });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        await (0, service_1.invalidateSession)(req.params.id, req.user.id, db_1.default);
        res.json({ data: { ok: true } });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
exports.default = router;
