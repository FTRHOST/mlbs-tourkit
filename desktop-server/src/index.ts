import { AdbService } from './services/AdbService.js';
import { GameListener } from './services/GameListener.js';
import { SocketServer } from './services/SocketServer.js';
import { Database } from './services/Database.js';

// Initialize Services
const adbService = new AdbService();
adbService.setupForwarding();

const socketServer = new SocketServer();
socketServer.start();

const database = new Database();

const gameListener = new GameListener();

gameListener.on('data', (data) => {
    // Broadcast real-time data to frontend
    socketServer.broadcast('update', data);

    // Check for Game Over state to save match
    // Based on GameLogic.cpp, GetBattleState returns an int.
    // 7 seems to be End/GameOver based on logic there (stopping timer).
    if (data.debug && data.debug.game_state === 7) {
        console.log("Game Over detected. Saving match...");
        database.saveMatch(data);
    }
});

gameListener.start();
