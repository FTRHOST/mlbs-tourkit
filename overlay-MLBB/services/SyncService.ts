import { io, Socket } from 'socket.io-client';
import { AppState, GameData } from '../types';

const SOCKET_URL = 'http://localhost:3000';

class SyncService {
  private socket: Socket | null = null;
  private onUpdateCallback: ((state: AppState) => void) | null = null;
  private onGameDataCallback: ((data: GameData) => void) | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    this.socket = io(SOCKET_URL);

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      this.isConnected = false;
    });

    // Listen for manual overlay state updates (if any)
    this.socket.on('state_update', (state: AppState) => {
        if (this.onUpdateCallback) {
            this.onUpdateCallback(state);
        }
    });

    // Listen for real-time game data from C++ -> Node.js -> Frontend
    this.socket.on('update', (data: GameData) => {
        if (this.onGameDataCallback) {
            this.onGameDataCallback(data);
        }
        // Also potentially merge into AppState if needed
    });
  }

  // Kirim state manual ke server (e.g. control panel updates)
  saveState(state: AppState) {
    if (this.socket && this.isConnected) {
      this.socket.emit('save_state', state);
    }
  }

  onUpdate(callback: (state: AppState) => void) {
    this.onUpdateCallback = callback;
  }

  onGameData(callback: (data: GameData) => void) {
      this.onGameDataCallback = callback;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const syncService = new SyncService();
