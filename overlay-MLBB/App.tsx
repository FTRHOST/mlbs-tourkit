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
        return prev ? { ...prev, ...newState } : (newState as AppState);
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
    const roomInfo = current.gameData?.data?.room_info;
    
    if (roomInfo && roomInfo.players) {
      // Siapkan object baru untuk Blue dan Red team
      const newBlue = { ...current.blue, picks: [...current.blue.picks], bans: [...current.blue.bans], pNames: [...current.blue.pNames] };
      const newRed = { ...current.red, picks: [...current.red.picks], bans: [...current.red.bans], pNames: [...current.red.pNames] };
      
      let blueIdx = 0;
      let redIdx = 0;

      roomInfo.players.forEach((p: any) => {
        // Asumsi: iCamp 1 = Blue/Left, iCamp 2 = Red/Right
        if (p.iCamp === 1) {
          if (blueIdx < 5) {
            newBlue.picks[blueIdx] = p.heroid.toString();
            newBlue.bans[blueIdx] = p.banHero.toString();
            newBlue.pNames[blueIdx] = p._sName || `Player ${blueIdx + 1}`;
            blueIdx++;
          }
        } else if (p.iCamp === 2) {
          if (redIdx < 5) {
            newRed.picks[redIdx] = p.heroid.toString();
            newRed.bans[redIdx] = p.banHero.toString();
            newRed.pNames[redIdx] = p._sName || `Player ${redIdx + 1}`;
            redIdx++;
          }
        }
      });

      current.blue = newBlue;
      current.red = newRed;
    }

    // Battle Stats mapping (Timer)
    const battleStats = current.gameData?.data?.battle_stats;
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
          <p>Pastikan Terminal 3 (Port 3003) berjalan.</p>
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
