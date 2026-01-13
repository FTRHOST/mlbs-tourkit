import { io, Socket } from 'socket.io-client';
import { AppState, GameData } from '../types';

type Listener = (state: Partial<AppState>) => void;

class SyncService {
  private socket: Socket;
  private gameSocket: Socket | null = null;
  private listeners: Listener[] = [];

  // 1. Simpan state terakhir secara internal
  private currentState: Partial<AppState> = {
    status: 'connecting',
    gameData: undefined
  };

  constructor() {
    // 1. Konek ke Overlay Server (Port 3003) untuk Nama Tim, Skor, dll.
    this.socket = io('http://localhost:3003', {
      transports: ['websocket', 'polling']
    });

    // 2. Konek ke Game Server (Port 3000) untuk Data In-Game Realtime
    this.gameSocket = io('http://localhost:3000', {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners() {
    // --- MAIN OVERLAY SOCKET (3003) ---
    this.socket.on('connect', () => {
      console.log('✅ Connected to Overlay Server (3003)');
      this.updateState({ status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Overlay Server');
      this.updateState({ status: 'disconnected' });
    });

    // Terima update state dari server.ts
    this.socket.on('state_update', (state: AppState) => {
      this.updateState(state);
    });

    // --- GAME DATA SOCKET (3000) ---
    if (this.gameSocket) {
        this.gameSocket.on('connect', () => console.log('✅ Connected to Game Data (3000)'));
        this.gameSocket.on('disconnect', () => console.log('❌ Disconnected from Game Data (3000)'));

        this.gameSocket.on('update', (data: GameData) => {
            // Masukkan data game ke dalam state global
            this.updateState({ gameData: data });
        });
    }
  }

  // 2. Fungsi helper untuk update state & notify listeners
  private updateState(newState: Partial<AppState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners(newState);
  }

  addListener(listener: Listener) {
    this.listeners.push(listener);
    // 3. PENTING: Langsung kirim status terakhir ke listener baru!
    listener(this.currentState);
  }

  removeListener(listener: Listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(state: Partial<AppState>) {
    this.listeners.forEach(listener => listener(state));
  }

  // Kirim data balik ke server (untuk Control Panel)
  saveState(state: AppState) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_state', state);
    }
  }

  resetState() {
     // Panggil API reset via fetch karena server.ts handle /reset endpoint
    fetch('http://localhost:3003/reset', { method: 'POST' })
        .catch(err => console.error("Reset failed", err));
  }

  getIsConnected(): boolean {
    return this.socket.connected;
  }
}

export const syncService = new SyncService();
