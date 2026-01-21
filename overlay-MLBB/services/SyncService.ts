import { io, Socket } from 'socket.io-client';
import { AppState, GameData } from '../types';

type Listener = (state: Partial<AppState>) => void;

class SyncService {
  private static instance: SyncService;
  private socket: Socket;
  private listeners: Listener[] = [];

  private currentState: Partial<AppState> = {
    status: 'connecting',
    gameData: undefined
  };

  constructor() {
    // Determine connection URL
    // If running via Vite Proxy (development), usually connects to same origin.
    // But since Socket.IO port is distinct (3000) and we might access via IP, let's explicit it.
    // If accessed via http://192.168.1.5:5173, we want socket at http://192.168.1.5:3000
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = '3000';
    const url = `${protocol}//${hostname}:${port}`;

    console.log('🔌 Connecting to Unified Server at:', url);

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
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
    this.socket.on('connect', () => {
      console.log('✅ Connected to Unified Server');
      this._updateInternalState({ status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from Unified Server');
      this._updateInternalState({ status: 'disconnected' });
    });

    // 1. Overlay State Updates (Team Names, Score, Config)
    this.socket.on('state_update', (state: AppState) => {
      // console.log('📥 State Update received');
      this._updateInternalState(state);
    });

    // 2. Game Data Updates (Real-time from ADB/Zygisk)
    // NOTE: Backend now sends fully mapped state via 'state_update'.
    // The 'update' event (raw GameData) is legacy, but we keep listening
    // to populate 'gameData' field for the Admin Panel's "Live Monitor" functionality
    // (if it chooses to use raw data for debugging/logging).
    // The AppState from 'state_update' handles the actual picks/bans.
    this.socket.on('update', (data: GameData) => {
      // console.log('🎮 Game Data received');
      this._updateInternalState({ gameData: data });
    });
  }

  private _updateInternalState(newState: Partial<AppState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.notifyListeners(newState);
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
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

  updateState(partialState: Partial<AppState>) {
    if (this.socket && this.socket.connected) {
        this.socket.emit('update_state', partialState);
    }
  }

  // --- ATOMIC REGISTRY OPERATIONS ---
  addRegistryTeam(team: any) {
      if (this.socket && this.socket.connected) {
          this.socket.emit('add_registry_team', team);
      }
  }

  updateRegistryTeam(team: any) {
      if (this.socket && this.socket.connected) {
          this.socket.emit('update_registry_team', team);
      }
  }

  removeRegistryTeam(teamId: string) {
      if (this.socket && this.socket.connected) {
          this.socket.emit('remove_registry_team', teamId);
      }
  }

  clearTeamLibrary() {
      if (this.socket && this.socket.connected) {
          this.socket.emit('clear_team_library');
      }
  }

  saveState(state: AppState) {
    if (this.socket && this.socket.connected) {
      // Create a shallow copy to modify
      const payload: any = { ...state };
      
      // Remove large/atomic collections to prevent overwriting with stale data
      // These lists are managed by atomic events (add/remove/update) or specific API calls
      delete payload.registry;
      delete payload.teamLibrary;
      delete payload.history;

      this.socket.emit('update_state', payload);
    }
  }

  resetState() {
    // Use the proxy configured in Vite
    fetch('/api/reset', { method: 'POST' })
        .then(res => res.json())
        .then(data => console.log('Reset response:', data))
        .catch(err => console.error("Reset failed", err));
  }

  getIsConnected(): boolean {
    return this.socket.connected;
  }
}

export { SyncService };
export const syncService = SyncService.getInstance();
