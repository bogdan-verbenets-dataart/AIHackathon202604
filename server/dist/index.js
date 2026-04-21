"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
require("dotenv/config");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./config");
const db_1 = __importDefault(require("./db"));
const redis_1 = __importDefault(require("./redis"));
const socket_1 = require("./socket");
const router_1 = require("./modules/messages/router");
const router_2 = __importDefault(require("./modules/auth/router"));
const router_3 = __importDefault(require("./modules/users/router"));
const router_4 = __importDefault(require("./modules/sessions/router"));
const router_5 = __importDefault(require("./modules/rooms/router"));
const router_6 = __importDefault(require("./modules/contacts/router"));
const router_7 = __importDefault(require("./modules/attachments/router"));
const router_8 = require("./modules/messages/router");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/api/auth', router_2.default);
app.use('/api/users', router_3.default);
app.use('/api/sessions', router_4.default);
app.use('/api/rooms', router_5.default);
app.use('/api/contacts', router_6.default);
app.use('/api/chats', router_8.chatsRouter);
app.use('/api/messages', router_8.messagesRouter);
app.use('/api/attachments', router_7.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
const server = http_1.default.createServer(app);
exports.server = server;
const io = (0, socket_1.setupSocket)(server, db_1.default, redis_1.default);
(0, router_1.setIo)(io);
server.listen(config_1.config.port, () => {
    console.log(`Server running on port ${config_1.config.port} [${config_1.config.nodeEnv}]`);
});
