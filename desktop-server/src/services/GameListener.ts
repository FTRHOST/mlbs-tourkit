import net from 'net';

export class GameListener {
    private server: net.Server;
    private port: number = 12345;
    private buffer: string = '';

    constructor() {
        this.server = net.createServer((socket) => {
            console.log('Game Client Connected');

            socket.on('data', (data: Buffer) => {
                this.handleData(data);
            });

            socket.on('end', () => {
                console.log('Game Client Disconnected');
            });

            socket.on('error', (err) => {
                console.error('Socket Error:', err.message);
            });
        });
    }

    public start(): void {
        this.server.listen(this.port, () => {
            console.log(`TCP Game Listener started on port ${this.port}`);
        });
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
            // Assuming the structure matches what GameLogic.cpp sends.
            // Example logging: [GAME DATA] Gold: ..., KDA: ...

            // Adjust property access based on actual JSON structure from GameLogic.cpp
            // Based on previous context (GameLogic.cpp):
            // "logic_players": [{"m_ID":..., "totalGold":..., "_TripleKillTimes":..., ...}]
            // "battle_stats": {"m_iCampAKill":..., "m_iCampBKill":...}

            // NOTE: The C++ code in Step 1 sends:
            // {"type":"heartbeat", "data": { "room_info": ..., "logic_players": [...], "battle_stats": ... }}

            if (json.data && json.data.logic_players && Array.isArray(json.data.logic_players)) {
                // Just log the first player's stats or similar as a proof of concept
                const player = json.data.logic_players[0];
                if (player) {
                     const gold = player.totalGold;
                     // KDA might need calculation or checking other fields if not explicitly passed as KDA
                     // m_iCampAKill etc are in battle_stats

                     console.log(`[GAME DATA] Gold: ${gold}`);
                } else {
                    console.log('[GAME DATA] Received data (No player details)');
                }
            } else {
                 console.log('[GAME DATA]', message);
            }

        } catch (e) {
            console.error('Failed to parse JSON:', e);
            console.error('Raw message:', message);
        }
    }
}
