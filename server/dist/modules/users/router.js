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
router.get('/search', auth_1.authenticate, async (req, res) => {
    try {
        const q = req.query.q ?? '';
        if (!q.trim()) {
            res.status(400).json({ error: 'Query parameter q is required' });
            return;
        }
        const users = await (0, service_1.searchUsers)(q, req.user.id, db_1.default);
        res.json({ data: users });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const user = await (0, service_1.getUserById)(req.params.id, db_1.default);
        res.json({ data: user });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
exports.default = router;
