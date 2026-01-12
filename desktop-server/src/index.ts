import net from 'net';
import { Server } from 'socket.io';
import http from 'http';
import { AdbService } from './services/AdbService.js';
import { GameListener } from './services/GameListener.js';

const SOCKET_IO_PORT = 3000;

// Setup Socket.IO Server
const httpServer = http.createServer();
const io = new Server(httpServer, {
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
const adbService = new AdbService();
adbService.setupForwarding();

const gameListener = new GameListener();
gameListener.start();
