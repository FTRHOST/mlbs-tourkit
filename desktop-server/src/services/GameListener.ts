import net from 'net';
import { EventEmitter } from 'events';

export class GameListener extends EventEmitter {
    private client: net.Socket;
    private port: number = 12345;
    private host: string = '127.0.0.1';
    private buffer: string = '';
    private reconnectInterval: number = 1000;
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
        });

        this.client.on('close', () => {
            if (this.isConnected) {
                console.log('Game Connection Closed. Reconnecting...');
            }
            this.isConnected = false;
            this.scheduleReconnect();
        });

        this.client.on('error', (err: any) => {
            if (err.code === 'ECONNREFUSED') {
                // Squelch this specific error as it's expected when polling
            } else {
                console.error('Socket Error:', err.message);
            }
            this.isConnected = false;
        });
    }

    public start(): void {
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

            if (json.data && json.data.logic_players && Array.isArray(json.data.logic_players)) {
                // Keep the simple log for debugging
                const player = json.data.logic_players[0];
                if (player && player.totalGold !== undefined) {
                     console.log(`[GAME DATA] Gold: ${player.totalGold}`);
                }
            }

        } catch (e) {
            console.error('Failed to parse JSON:', e);
        }
    }
}
