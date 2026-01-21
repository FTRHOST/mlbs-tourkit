import net from 'net';
import { EventEmitter } from 'events';

export class GameListener extends EventEmitter {
    private client: net.Socket;
    private port: number = 12345;
    private host: string = '127.0.0.1';
    private buffer: string = '';
    private reconnectInterval: number = 2000; // Increased interval
    private isConnected: boolean = false;

    constructor() {
        super();
        this.client = new net.Socket();

        this.client.on('data', (data: Buffer) => {
            this.handleData(data);
        });

        this.client.on('connect', () => {
            console.log('Connected to Game (via ADB Forward)');
            this.isConnected = true;
            this.emit('status', 'connected');
        });

        this.client.on('close', () => {
            const wasConnected = this.isConnected;
            this.isConnected = false;
            if (wasConnected) {
                console.log('Game Connection Closed. Reconnecting...');
                this.emit('status', 'reconnecting');
            }
            this.scheduleReconnect();
        });

        this.client.on('error', (err: any) => {
            if (err.code !== 'ECONNREFUSED') {
                console.error('Socket Error:', err.message);
            }
            // The 'close' event will be called immediately after an error,
            // which handles the reconnect logic. We just update the state here.
            this.isConnected = false;
        });
    }

    public start(): void {
        console.log('Game listener started. Trying to connect...');
        this.emit('status', 'connecting');
        this.connect();
    }

    private connect(): void {
        this.client.connect(this.port, this.host);
    }

    private scheduleReconnect(): void {
        setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }

    private handleData(data: Buffer): void {
        this.buffer += data.toString();

        let delimiterIndex: number;
        while ((delimiterIndex = this.buffer.indexOf('\n')) !== -1) {
            const message = this.buffer.slice(0, delimiterIndex);
            this.buffer = this.buffer.slice(delimiterIndex + 1);
            this.processMessage(message);
        }
    }

    private processMessage(message: string): void {
        if (!message.trim()) return;

        try {
            const json = JSON.parse(message);
            this.emit('data', json);
        } catch (e) {
            console.error('Failed to parse JSON message:', message, e);
        }
    }
}
