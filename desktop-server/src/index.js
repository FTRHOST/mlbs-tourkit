"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const AdbService_1 = require("./services/AdbService");
const GameListener_1 = require("./services/GameListener");
const SOCKET_IO_PORT = 3000;
// Setup Socket.IO Server
const httpServer = http_1.default.createServer();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
io.on('connection', (socket) => {
    console.log('Frontend client connected');
});
httpServer.listen(SOCKET_IO_PORT, () => {
    console.log(`Socket.IO server listening on port ${SOCKET_IO_PORT}`);
});
// Initialize Services
const adbService = new AdbService_1.AdbService();
adbService.setupForwarding();
const gameListener = new GameListener_1.GameListener();
gameListener.start();
//# sourceMappingURL=index.js.map