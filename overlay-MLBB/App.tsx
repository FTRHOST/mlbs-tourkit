import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import Overlay from './components/Overlay';
import ControlPanel from './ControlPanel';
import { SyncService } from './services/SyncService';
import { AppState, DEFAULT_APP_STATE, DEFAULT_GAME_DATA } from './types';

const OverlayContainer: React.FC<{ state: AppState }> = ({ state }) => {
  useEffect(() => {
    const scaleUI = () => {
      const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      const container = document.getElementById('overlay-main');
      if (container) {
        container.style.transform = `scale(${s})`;
      }
    };
    window.addEventListener('resize', scaleUI);
    scaleUI();
    return () => window.removeEventListener('resize', scaleUI);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#00FF00]">
      <div id="overlay-main" className="origin-top-left w-[1920px] h-[1080px]">
        <Overlay data={state} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);

  // 1. Setup Koneksi Socket
  useEffect(() => {
    const sync = SyncService.getInstance();
    
    const handleUpdate = (newState: Partial<AppState>) => {
      setState(prev => {
        return prev ? { ...prev, ...newState } : { ...DEFAULT_APP_STATE, ...newState };
      });
    };

    sync.subscribe(handleUpdate);

    return () => {
      sync.removeListener(handleUpdate);
    };
  }, []);

  const updateState = useCallback((newState: AppState | ((prev: AppState) => AppState)) => {
    setState(prev => {
      if (!prev) {
          if (typeof newState === 'function') return null;
          SyncService.getInstance().saveState(newState);
          return newState;
      }
      const updated = typeof newState === 'function' ? newState(prev) : newState;
      SyncService.getInstance().saveState(updated);
      return updated;
    });
  }, []);

  const resetState = useCallback(() => {
    SyncService.getInstance().resetState();
  }, []);

  // --- PERBAIKAN: useMemo diletakkan DISINI (Sebelum 'if !state return') ---
  const displayState: AppState = useMemo(() => {
    // Jika state belum ada, gunakan default agar tidak error
    if (!state) return DEFAULT_APP_STATE;

    // Copy state saat ini
    const current: AppState = { 
      ...DEFAULT_APP_STATE, 
      ...state, 
      gameData: state.gameData || DEFAULT_GAME_DATA 
    };

    // --- LOGIKA MAPPING DATA GAME C++ KE UI ---
    // REMOVED: Frontend mapping is now handled by the Backend (processGameData)
    // The AppState received from 'state_update' event already contains the mapped Picks/Bans/Timer.
    
    // Legacy fallback or additional client-side overrides can go here if needed,
    // but for now we rely on the server's truth.

    return current;
  }, [state]);

  // --- LOADING CHECK (Hanya boleh dilakukan SETELAH semua hooks dideklarasikan) ---
  if (!state) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connecting to Overlay Server...</h1>
          <p>Pastikan Terminal Unified Server (Port 3000) berjalan.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<OverlayContainer state={displayState} />} />
      <Route 
        path="/control" 
        element={
          <ControlPanel 
            state={displayState} 
            updateState={updateState} 
            resetState={resetState} 
          />
        } 
      />
    </Routes>
  );
};

export default App;
