"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const TCP_PORT = 12345;
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
// Setup TCP Server for Android communication
const server = net_1.default.createServer((socket) => {
    console.log('Android device connected');
    socket.on('data', (data) => {
        try {
            const message = data.toString();
            console.log('Received data from Android:', message);
            // Try to parse as JSON
            try {
                const jsonData = JSON.parse(message);
                console.log('Parsed JSON:', jsonData);
                // Broadcast to frontend
                io.emit('game_data', jsonData);
            }
            catch (e) {
                console.log('Data is not valid JSON, raw message:', message);
            }
        }
        catch (err) {
            console.error('Error processing data:', err);
        }
    });
    socket.on('end', () => {
        console.log('Android device disconnected');
    });
    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });
});
server.listen(TCP_PORT, () => {
    console.log(`Listening for Game Data on port ${TCP_PORT}...`);
});
//# sourceMappingURL=index.js.map