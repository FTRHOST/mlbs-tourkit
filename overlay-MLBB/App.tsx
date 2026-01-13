
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import Overlay from './components/Overlay';
import ControlPanel from './ControlPanel';
import { AppState } from './types';
import { syncService } from './services/SyncService';
import { DEFAULT_APP_STATE, DEFAULT_GAME_DATA } from './defaultData';

// INITIAL_STATE is now managed by the server.
// The client will receive it upon connection.

const App: React.FC = () => {
  // Initialize state to null until we get it from the server
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    // Updated to use addListener/removeListener
    const handleUpdate = (newState: Partial<AppState>) => {
      setState(prev => {
        // Merge previous state with new partial state
        // If prev is null, newState acts as the initial state (assuming it has enough data or we handle partials)
        return prev ? { ...prev, ...newState } : (newState as AppState);
      });
    };

    syncService.addListener(handleUpdate);
    return () => syncService.removeListener(handleUpdate);
  }, []); // Empty dependency array means this runs once on mount

  const updateState = useCallback((newState: AppState | ((prev: AppState) => AppState)) => {
    // We need to handle the function form of setState
    setState(prev => {
      // If the previous state is null, we can't apply a function update.
      // This case should ideally not happen if updateState is called only after state is set.
      if (prev === null) {
          if (typeof newState === 'function') return null;
          syncService.saveState(newState);
          return newState;
      }
      
      const updated = typeof newState === 'function' ? newState(prev) : newState;
      syncService.saveState(updated);
      return updated;
    });
  }, []);

  const resetState = () => {
    // This now sends a request to the server to reset the state for everyone
    syncService.resetState();
  };

  // Render a loading/connecting message until we have state
  // Check if we are still connecting
  if (!state || state.status !== 'connected') {
    return <div className="w-screen h-screen bg-slate-900 text-white flex items-center justify-center font-sans text-2xl">Connecting to server... {state?.status}</div>;
  }

  // Gunakan useMemo untuk memproses gameData menjadi displayState setiap kali state berubah
  const displayState: AppState = useMemo(() => {
    // 1. Ambil base state atau default
    if (!state) return DEFAULT_APP_STATE;

    // Copy state saat ini agar immutability terjaga
    // Pastikan gameData tidak undefined
    const current: AppState = {
      ...DEFAULT_APP_STATE,
      ...state,
      gameData: state.gameData || DEFAULT_GAME_DATA
    };

    // 2. Cek apakah ada data game dari C++ (Room Info)
    const roomInfo = current.gameData?.data?.room_info;

    if (roomInfo && roomInfo.players) {
      // Siapkan array baru untuk picks/bans/pNames agar react mendeteksi perubahan
      // Kita copy dari current (yang sudah dimerge dengan state)
      const newBlue = {
          ...current.blue,
          picks: [...current.blue.picks],
          bans: [...current.blue.bans],
          pNames: [...current.blue.pNames]
      };
      const newRed = {
          ...current.red,
          picks: [...current.red.picks],
          bans: [...current.red.bans],
          pNames: [...current.red.pNames]
      };

      let blueIdx = 0;
      let redIdx = 0;

      // 3. Loop setiap player dan masukkan ke tim yang sesuai
      roomInfo.players.forEach((p: any) => {
        // Asumsi: iCamp 1 = Blue Team, iCamp 2 = Red Team
        if (p.iCamp === 1) {
          if (blueIdx < 5) {
            // Update Pick
            if (p.heroid && p.heroid !== 0) newBlue.picks[blueIdx] = p.heroid.toString();
            // Update Ban
            if (p.banHero && p.banHero !== 0) newBlue.bans[blueIdx] = p.banHero.toString();
            // Update Name
            if (p._sName) newBlue.pNames[blueIdx] = p._sName;

            blueIdx++;
          }
        } else if (p.iCamp === 2) {
          if (redIdx < 5) {
            if (p.heroid && p.heroid !== 0) newRed.picks[redIdx] = p.heroid.toString();
            if (p.banHero && p.banHero !== 0) newRed.bans[redIdx] = p.banHero.toString();
            if (p._sName) newRed.pNames[redIdx] = p._sName;

            redIdx++;
          }
        }
      });

      // Update state sementara untuk ditampilkan
      current.blue = newBlue;
      current.red = newRed;
    }

    // 4. Cek Battle Stats (untuk Timer/Score jika ada)
    const battleStats = current.gameData?.data?.battle_stats;
    if (battleStats) {
        // Update timer dari data battle (jika > 0)
        if (battleStats.time > 0) {
            current.game = { ...current.game, timer: Math.floor(battleStats.time) };
        }

        // Auto update Score (Kill count) - Uncomment jika diinginkan
        // current.blue = { ...current.blue, score: battleStats.m_iCampAKill };
        // current.red = { ...current.red, score: battleStats.m_iCampBKill };
    }

    return current;
  }, [state]);

  return (
    <Routes>
      <Route path="/" element={<OverlayContainer state={displayState} />} />
      <Route path="/control" element={<ControlPanel state={displayState} updateState={updateState} resetState={resetState} />} />
    </Routes>
  );
};

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

export default App;
