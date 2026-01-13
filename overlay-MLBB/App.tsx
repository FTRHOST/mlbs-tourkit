
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import Overlay from './components/Overlay';
import ControlPanel from './ControlPanel';
import { AppState } from './types';
import { syncService } from './services/SyncService';

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
  // Check if we have core data (e.g., blue team data) or if we are still connecting
  if (!state || !state.blue) {
    return <div className="w-screen h-screen bg-slate-900 text-white flex items-center justify-center font-sans text-2xl">Connecting to server... {state?.status}</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<OverlayContainer state={state} />} />
      <Route path="/control" element={<ControlPanel state={state} updateState={updateState} resetState={resetState} />} />
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
