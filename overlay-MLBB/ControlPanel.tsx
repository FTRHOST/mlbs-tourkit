
import React, { useEffect, useRef, useState } from 'react';
import AdminPanel from './components/AdminPanel';
import Overlay from './components/Overlay';
import { AppState } from './types';

interface ControlPanelProps {
  state: AppState;
  updateState: (newState: AppState | ((prev: AppState) => AppState)) => void;
  resetState: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ state, updateState, resetState }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      updateState(prev => {
        if (!prev?.game?.isGameControlEnabled || prev.game.timer <= 0) return prev;
        return {
          ...prev,
          game: {
            ...prev.game,
            timer: prev.game.timer - 1
          }
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [updateState]);

  useEffect(() => {
    if (state.game.isIntroActive) {
      const timer = setTimeout(() => {
        updateState(prev => ({
          ...prev,
          game: { ...prev.game, isIntroActive: false }
        }));
      }, 9500);
      return () => clearTimeout(timer);
    }
  }, [state.game.isIntroActive, updateState]);

  useEffect(() => {
    if (!showPreview) return; // Skip scaling if preview is hidden

    const scaleUI = () => {
      if (!previewRef.current) return;
      const containerWidth = previewRef.current.clientWidth;
      const containerHeight = previewRef.current.clientHeight;
      const s = Math.min(containerWidth / 1920, containerHeight / 1080);
      const overlay = previewRef.current.querySelector('#overlay-preview') as HTMLElement;
      if (overlay) {
        overlay.style.transform = `scale(${s})`;
      }
    };
    window.addEventListener('resize', scaleUI);
    scaleUI();
    return () => window.removeEventListener('resize', scaleUI);
  }, [state, showPreview]);

  return (
    <div className="flex flex-col h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* Top Preview Section */}
      <div className={`${showPreview ? 'h-[45vh]' : 'h-14'} bg-black/40 flex flex-col border-b border-slate-700 shadow-2xl relative transition-all duration-300 ease-in-out shrink-0`}>
        <div className="absolute top-0 left-0 right-0 h-14 px-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${showPreview ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Live Monitor</span>
          </div>
          
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-colors"
          >
            <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showPreview ? (
                <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>
              ) : (
                <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>
              )}
            </svg>
          </button>
        </div>
        
        {showPreview && (
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden pt-12">
            <div 
              ref={previewRef} 
              className="w-full h-full max-w-[1280px] aspect-video bg-[#00FF00]/10 border border-slate-800 shadow-inner flex items-center justify-center relative overflow-hidden rounded-lg"
            >
              <div id="overlay-preview" className="origin-center w-[1920px] h-[1080px]">
                <Overlay data={state} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Section */}
      <div className="flex-1 overflow-hidden relative">
         <AdminPanel state={state} setState={updateState} resetState={resetState} />
      </div>
    </div>
  );
};

export default ControlPanel;
