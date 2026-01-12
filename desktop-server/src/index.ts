import net from 'net';
import { Server } from 'socket.io';
import http from 'http';

const TCP_PORT = 12345;
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

// Setup TCP Server for Android communication
const server = net.createServer((socket) => {
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
            } catch (e) {
                console.log('Data is not valid JSON, raw message:', message);
            }

        } catch (err) {
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
