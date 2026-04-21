"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAttachment = uploadAttachment;
exports.getAttachment = getAttachment;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const policy_1 = require("../../lib/policy");
const config_1 = require("../../config");
async function uploadAttachment(file, userId, comment, prisma) {
    const attachment = await prisma.attachment.create({
        data: {
            originalName: file.originalname,
            storagePath: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            comment: comment ?? null,
            uploaderId: userId,
        },
    });
    return attachment;
}
async function getAttachment(attachmentId, userId, prisma) {
    const allowed = await (0, policy_1.canAccessAttachment)(userId, attachmentId, prisma);
    if (!allowed)
        throw Object.assign(new Error('Forbidden'), { status: 403 });
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment)
        throw Object.assign(new Error('Attachment not found'), { status: 404 });
    const filePath = path_1.default.join(config_1.config.uploadsDir, attachment.storagePath);
    if (!fs_1.default.existsSync(filePath)) {
        throw Object.assign(new Error('File not found on disk'), { status: 404 });
    }
    return { attachment, filePath };
}
