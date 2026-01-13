import { io, Socket } from 'socket.io-client';
import { AppState, GameData } from '../types';

type Listener = (state: Partial<AppState>) => void;

class SyncService {
  private static instance: SyncService;
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

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private setupSocketListeners() {
    // --- MAIN OVERLAY SOCKET (3003) ---
    this.socket.on('connect', () => {
      console.log('✅ Connected to Overlay Server (3003)');
      this._updateInternalState({ status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Overlay Server');
      this._updateInternalState({ status: 'disconnected' });
    });

    // Terima update state dari server.ts
    this.socket.on('state_update', (state: AppState) => {
      this._updateInternalState(state);
    });

    // --- GAME DATA SOCKET (3000) ---
    if (this.gameSocket) {
        this.gameSocket.on('connect', () => console.log('✅ Connected to Game Data (3000)'));
        this.gameSocket.on('disconnect', () => console.log('❌ Disconnected from Game Data (3000)'));

        this.gameSocket.on('update', (data: GameData) => {
            // Masukkan data game ke dalam state global
            this._updateInternalState({ gameData: data });
        });
    }
  }

  // Helper internal untuk update state & notify listeners
  private _updateInternalState(newState: Partial<AppState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners(newState);
  }

  // Method yang diminta oleh App.tsx baru
  subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Langsung kirim status terakhir ke listener baru!
    listener(this.currentState);
  }

  addListener(listener: Listener) {
    this.subscribe(listener);
  }

  removeListener(listener: Listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(state: Partial<AppState>) {
    this.listeners.forEach(listener => listener(state));
  }

  // Method untuk update state dari client (Control Panel / App.tsx)
  updateState(partialState: Partial<AppState>) {
    // Kita kirim partial ke server, server akan broadcast balik
    if (this.socket && this.socket.connected) {
        // Gabungkan dengan current agar server mendapat full state jika perlu, 
        // atau server bisa handle partial. Di server.ts biasanya handle full state.
        const fullState = { ...this.currentState, ...partialState } as AppState;
        this.socket.emit('update_state', fullState);
    }
  }

  saveState(state: AppState) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_state', state);
    }
  }

  resetState() {
    fetch('http://localhost:3003/reset', { method: 'POST' })
        .catch(err => console.error("Reset failed", err));
  }

  getIsConnected(): boolean {
    return this.socket.connected;
  }
}

export { SyncService };
export const syncService = SyncService.getInstance();