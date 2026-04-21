"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../db"));
const auth_1 = require("../../middleware/auth");
const upload_1 = require("../../middleware/upload");
const service_1 = require("./service");
const router = (0, express_1.Router)();
router.post('/upload', auth_1.authenticate, upload_1.upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const comment = req.body.comment;
        const attachment = await (0, service_1.uploadAttachment)(req.file, req.user.id, comment, db_1.default);
        res.status(201).json({ data: attachment });
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { attachment, filePath } = await (0, service_1.getAttachment)(req.params.id, req.user.id, db_1.default);
        res.setHeader('Content-Type', attachment.mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
        res.sendFile(filePath);
    }
    catch (err) {
        const e = err;
        res.status(e.status ?? 500).json({ error: e.message });
    }
});
exports.default = router;
