import { Server } from 'socket.io';
import http from 'http';

export class SocketServer {
    private io: Server;
    private httpServer: http.Server;
    private port: number = 3000;

    constructor() {
        this.httpServer = http.createServer();
        this.io = new Server(this.httpServer, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.io.on('connection', (socket) => {
            console.log('Frontend client connected');
        });
    }

    public start(): void {
        this.httpServer.listen(this.port, () => {
            console.log(`Socket.IO server listening on port ${this.port}`);
        });
    }

    public broadcast(event: string, data: any): void {
        this.io.emit(event, data);
    }
}
