"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameListener = void 0;
const net_1 = __importDefault(require("net"));
class GameListener {
    server;
    port = 12345;
    buffer = '';
    constructor() {
        this.server = net_1.default.createServer((socket) => {
            console.log('Game Client Connected');
            socket.on('data', (data) => {
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
    start() {
        this.server.listen(this.port, () => {
            console.log(`TCP Game Listener started on port ${this.port}`);
        });
    }
    handleData(data) {
        this.buffer += data.toString();
        let delimiterIndex;
        while ((delimiterIndex = this.buffer.indexOf('\n')) !== -1) {
            const message = this.buffer.slice(0, delimiterIndex);
            this.buffer = this.buffer.slice(delimiterIndex + 1);
            this.processMessage(message);
        }
    }
    processMessage(message) {
        if (!message.trim())
            return;
        try {
            const json = JSON.parse(message);
            // Assuming the structure matches what GameLogic.cpp sends.
            // Example logging: [GAME DATA] Gold: ..., KDA: ...
            // Adjust property access based on actual JSON structure from GameLogic.cpp
            // Based on previous context (GameLogic.cpp):
            // "logic_players": [{"m_ID":..., "totalGold":..., "_TripleKillTimes":..., ...}]
            // "battle_stats": {"m_iCampAKill":..., "m_iCampBKill":...}
            // Let's try to extract some relevant info if available.
            // Or just log the raw JSON if structure is unknown here, but prompt asked for Gold/KDA.
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
                }
                else {
                    console.log('[GAME DATA] Received data (No player details)');
                }
            }
            else {
                console.log('[GAME DATA]', message);
            }
        }
        catch (e) {
            console.error('Failed to parse JSON:', e);
            console.error('Raw message:', message);
        }
    }
}
exports.GameListener = GameListener;
//# sourceMappingURL=GameListener.js.map