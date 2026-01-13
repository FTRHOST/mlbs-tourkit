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
    // Only map if Auto Sync is ENABLED globally
    const isAutoSync = current.game.visibility?.isAutoSync ?? true; 
    
    // Robust check for nested data
    const roomInfo = current.gameData?.data?.room_info || current.gameData?.room_info;
    
    if (isAutoSync && roomInfo && roomInfo.players) {
      // Sort players to ensure consistent slot mapping
      // REMOVED: .sort((a: any, b: any) => (a.lUid || 0) - (b.lUid || 0)) to prevent jumping
      const sortedPlayers = [...roomInfo.players];
      const blueTeamPlayers = sortedPlayers.filter((p: any) => p.iCamp === 1);
      const redTeamPlayers = sortedPlayers.filter((p: any) => p.iCamp === 2);

      const processSide = (sidePlayers: any[], currentTeam: any) => {
          const picks = Array(5).fill('0');
          const bans = Array(5).fill('0');
          const pNames = Array(5).fill('PLAYER');
          const pIds = Array(5).fill('');

          sidePlayers.forEach((p: any, idx: number) => {
              if (idx < 5) {
                  picks[idx] = String(p.heroid || 0);
                  pNames[idx] = p._sName || `PLAYER ${idx + 1}`;
                  pIds[idx] = String(p.lUid || '');
                  bans[idx] = String(p.banHero || 0);
              }
          });

          return {
              ...currentTeam,
              picks,
              bans,
              pNames,
              pIds
          };
      };

      current.blue = processSide(blueTeamPlayers, current.blue);
      current.red = processSide(redTeamPlayers, current.red);
    }

    // Battle Stats mapping (Timer)
    const battleStats = current.gameData?.data?.battle_stats || current.gameData?.battle_stats;
    if (battleStats && battleStats.time > 0) {
        current.game = { ...current.game, timer: Math.floor(battleStats.time) };
    }

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
