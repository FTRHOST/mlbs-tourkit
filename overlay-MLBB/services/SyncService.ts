import { io, Socket } from 'socket.io-client';
import { AppState, GameData } from '../types';

type Listener = (state: Partial<AppState>) => void;

class SyncService {
  private socket: Socket;
  private listeners: Listener[] = [];

  // 1. Simpan state terakhir secara internal
  private currentState: Partial<AppState> = {
    status: 'connecting',
    gameData: undefined
  };

  constructor() {
    // Pastikan URL backend benar (biasanya http://localhost:3000)
    this.socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'] // Paksa websocket agar lebih stabil
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket Connected');
      this.updateState({ status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket Disconnected');
      this.updateState({ status: 'disconnected' });
    });

    // Listen for manual overlay state updates (from control panel)
    this.socket.on('state_update', (state: AppState) => {
      this.updateState(state);
    });

    // Listen for real-time game data from C++ -> Node.js -> Frontend
    this.socket.on('update', (data: GameData) => {
      this.updateState({ gameData: data });
    });
  }

  // 2. Fungsi helper untuk update state & notify listeners
  private updateState(newState: Partial<AppState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners(newState);
  }

  addListener(listener: Listener) {
    this.listeners.push(listener);
    // 3. PENTING: Langsung kirim status terakhir ke listener baru!
    // Ini memperbaiki masalah "stuck on connecting"
    listener(this.currentState);
  }

  removeListener(listener: Listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(state: Partial<AppState>) {
    this.listeners.forEach(listener => listener(state));
  }

  // Legacy/Helper methods required by App.tsx

  saveState(state: AppState) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('save_state', state);
    }
  }

  resetState() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('reset_state');
    }
  }

  getIsConnected(): boolean {
    return this.socket.connected;
  }
}

export const syncService = new SyncService();
