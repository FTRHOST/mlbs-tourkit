import net from 'net';

export class GameListener {
    private client: net.Socket;
    private port: number = 12345;
    private host: string = '127.0.0.1';
    private buffer: string = '';
    private reconnectInterval: number = 1000;
    private isConnected: boolean = false;

    constructor() {
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
            // 'close' event is usually emitted after 'error', so reconnect logic is there.
            // But just in case 'close' doesn't fire on some errors:
            // We rely on 'close' to trigger reconnect to avoid double timers.
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

            if (json.data && json.data.logic_players && Array.isArray(json.data.logic_players)) {
                const player = json.data.logic_players[0];
                if (player) {
                     const gold = player.totalGold;
                     console.log(`[GAME DATA] Gold: ${gold}`);
                } else {
                    console.log('[GAME DATA] Received data (No player details)');
                }
            } else {
                 console.log('[GAME DATA]', message);
            }

        } catch (e) {
            console.error('Failed to parse JSON:', e);
            // console.error('Raw message:', message); // Optional: reduce noise
        }
    }
}
