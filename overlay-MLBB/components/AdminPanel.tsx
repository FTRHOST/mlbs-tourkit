import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, TeamData, AdConfig, RegisteredTeam, BracketMatch, SyncControl } from '../types';

interface AdminPanelProps {
  state: AppState;
  setState: (newState: AppState | ((prev: AppState) => AppState)) => void;
  resetState: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ state, setState, resetState }) => {
  const [draft, setDraft] = useState<AppState>(state);
  const [activeTab, setActiveTab] = useState<'teams' | 'history' | 'ads' | 'prepare' | 'network'>('teams');
  
  // Local state for the Prepare tab form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');

  // Local state for Network/Sync
  // isAutoSync now refers to the Global State setting
  
  // Stats
  const [lastPacketTime, setLastPacketTime] = useState<Date | null>(null);

  // Helper for deep comparison to avoid unnecessary updates/renders
  const isTeamEqual = (a: TeamData, b: TeamData) => {
    if (a.name !== b.name) return false;
    if (a.score !== b.score) return false;
    if (a.logo !== b.logo) return false;
    if (JSON.stringify(a.picks) !== JSON.stringify(b.picks)) return false;
    if (JSON.stringify(a.bans) !== JSON.stringify(b.bans)) return false;
    if (JSON.stringify(a.pNames) !== JSON.stringify(b.pNames)) return false;
    if (JSON.stringify(a.pIds) !== JSON.stringify(b.pIds)) return false;
    return true;
  };

  const handleApplyAll = useCallback(() => {
    setState(draft);
  }, [draft, setState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleApplyAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleApplyAll]);

  // --- SMART SYNC: State -> Draft ---
  // We track the previous server state to know what ACTUALLY changed on the server.
  // This prevents the Timer (which updates every second) from resetting user input in 'draft'.
  const prevStateRef = useRef(state);

  useEffect(() => {
    const prev = prevStateRef.current;
    
    setDraft(currentDraft => {
        let nextDraft = { ...currentDraft };
        let hasChanges = false;

        // 1. Sync Game Fields (Timer, Phase, Turn)
        // We always sync these as they are rarely edited via text input in a way that conflicts.
        if (state.game.timer !== prev.game.timer) {
            nextDraft.game = { ...nextDraft.game, timer: state.game.timer };
            hasChanges = true;
        }
        if (state.game.phase !== prev.game.phase) {
            nextDraft.game = { ...nextDraft.game, phase: state.game.phase };
            hasChanges = true;
        }
        if (state.game.turn !== prev.game.turn) {
            nextDraft.game = { ...nextDraft.game, turn: state.game.turn };
            hasChanges = true;
        }
        if (state.game.isIntroActive !== prev.game.isIntroActive) {
             nextDraft.game = { ...nextDraft.game, isIntroActive: state.game.isIntroActive };
             hasChanges = true;
        }
        // Sync matchTitle only if it changed on server (e.g. other admin), to allow typing.
        if (state.game.matchTitle !== prev.game.matchTitle) {
             nextDraft.game = { ...nextDraft.game, matchTitle: state.game.matchTitle };
             hasChanges = true;
        }
        // Sync Visibility
         if (JSON.stringify(state.game.visibility) !== JSON.stringify(prev.game.visibility)) {
             nextDraft.game = { ...nextDraft.game, visibility: state.game.visibility };
             hasChanges = true;
         }

        // 2. Sync Teams - Only if server state actually changed (e.g. Auto Sync or other Admin)
        if (!isTeamEqual(state.blue, prev.blue)) {
            nextDraft.blue = state.blue;
            hasChanges = true;
        }
        if (!isTeamEqual(state.red, prev.red)) {
            nextDraft.red = state.red;
            hasChanges = true;
        }

        // 3. Sync Configs
        if (JSON.stringify(state.ads) !== JSON.stringify(prev.ads)) {
             nextDraft.ads = state.ads;
             hasChanges = true;
        }
        if (JSON.stringify(state.adConfig) !== JSON.stringify(prev.adConfig)) {
             nextDraft.adConfig = state.adConfig;
             hasChanges = true;
        }
        if (JSON.stringify(state.syncControl) !== JSON.stringify(prev.syncControl)) {
             nextDraft.syncControl = state.syncControl;
             hasChanges = true;
        }
        if (JSON.stringify(state.registry) !== JSON.stringify(prev.registry)) {
             nextDraft.registry = state.registry;
             hasChanges = true;
        }
         if (JSON.stringify(state.history) !== JSON.stringify(prev.history)) {
             nextDraft.history = state.history;
             hasChanges = true;
        }

        return hasChanges ? nextDraft : currentDraft;
    });

    prevStateRef.current = state;
  }, [state]);

  // --- LIVE DATA PROCESSING ---
  // Instead of a socket connection, we watch the prop 'state.gameData' which comes from SyncService
  useEffect(() => {
    if (state.gameData) {
        setLastPacketTime(new Date());
        
        // REMOVED: processGameData() call.
        // We now rely on the backend (state_update) to drive the state.
        // The Smart Sync effect (above) ensures that `draft` updates when `state` changes.
    }
  }, [state.gameData]); // Trigger when new data arrives

  const latestDraftRef = useRef(draft);
  const latestStateRef = useRef(state);
  const lastGameStateRef = useRef<number | null>(null);
  
  useEffect(() => { latestDraftRef.current = draft; }, [draft]);
  useEffect(() => { latestStateRef.current = state; }, [state]);

  const processGameData = (data: any) => {
      // Robust check for nested data
      const roomInfo = data?.data?.room_info || data?.room_info;
      if (!roomInfo?.players) return;

      const currentDraft = latestDraftRef.current;
      const currentState = latestStateRef.current;
      const incomingGameState = data.debug?.game_state;

      // Sort players to ensure consistent slot mapping (MUST MATCH App.tsx)
      // REMOVED: .sort((a: any, b: any) => (a.lUid || 0) - (b.lUid || 0))
      const sortedPlayers = [...roomInfo.players];
      const blueTeamPlayers = sortedPlayers.filter((p: any) => p.iCamp === 1);
      const redTeamPlayers = sortedPlayers.filter((p: any) => p.iCamp === 2);

      const processSide = (sidePlayers: any[], side: 'blue' | 'red') => {
          const picks = Array(5).fill('0');
          const bans = Array(5).fill('0');
          const pNames = Array(5).fill('PLAYER');
          const pIds = Array(5).fill('');
          
          let teamIdToMatch = '';

          sidePlayers.forEach((p: any, idx: number) => {
              if (idx < 5) {
                  picks[idx] = String(p.heroid || 0);
                  pNames[idx] = p._sName || `PLAYER ${idx + 1}`;
                  pIds[idx] = String(p.lUid || '');
                  bans[idx] = String(p.banHero || 0);

                  if (!teamIdToMatch) {
                      const pUid = String(p.lUid || '');
                      const pName = String(p._sName || '').trim().toLowerCase();

                      // 1. Try to find in Registry (Manual Additions)
                      const regTeam = currentState.registry?.find(t => {
                          const leader = String(t.leaderId || '').trim().toLowerCase();
                          return (pUid && leader === pUid) || (pName && leader === pName);
                      });

                      if (regTeam) {
                          teamIdToMatch = regTeam.name;
                      } else {
                          // 2. Try to find in Team Library (Imported Excel)
                          const libTeam = currentState.teamLibrary?.find(t => {
                              const capId = String(t.captainId || '');
                              return pUid && capId === pUid;
                          });
                          
                          if (libTeam) {
                              teamIdToMatch = libTeam.name;
                          }
                      }
                  }
              }
          });

          // Use DRAFT as base to preserve any user typing for Name/Score/Logo
          const currentTeamState = currentDraft[side];
          const newTeamState = {
              ...currentTeamState,
              picks,
              pNames,
              pIds,
              bans
          };

          const DEFAULT_TEAM_NAMES = ["BLUE TEAM", "RED TEAM", "MANSABA A", "MANSABA B", "NO TEAM", "PETWIR", "Computer"];

          if (teamIdToMatch && teamIdToMatch !== currentTeamState.name && (DEFAULT_TEAM_NAMES.includes(currentTeamState.name) || !currentTeamState.name)) {
              const libTeam = currentState.teamLibrary?.find(t => t.name === teamIdToMatch);
              const regTeam = currentState.registry?.find(t => t.name === teamIdToMatch);
              
              if (regTeam) {
                  newTeamState.name = regTeam.name;
                  newTeamState.logo = regTeam.logo;
              } else if (libTeam) {
                  newTeamState.name = libTeam.name;
                  newTeamState.logo = libTeam.logoUrl;
              }
          }
          
          return newTeamState;
      };

      const newBlue = processSide(blueTeamPlayers, 'blue');
      const newRed = processSide(redTeamPlayers, 'red');

      // Base newState on CURRENT SERVER STATE (to preserve Timer), NOT Draft
      let newState = {
          ...currentState,
          blue: newBlue,
          red: newRed
      };

      // Auto Reset on transition 7->3 (New Match from Post-Game)
      // Removed State 0 check to prevent flickering/loops during unstable connection
      if (incomingGameState === 3 && lastGameStateRef.current === 7) {
          console.log(`Game State Transition (${lastGameStateRef.current} -> ${incomingGameState}): Resetting Overlay...`);
          // Clear picks/bans manually for immediate feedback
          newState.blue = { ...newState.blue, picks: ['0', '0', '0', '0', '0'], bans: ['0', '0', '0', '0', '0'] };
          newState.red = { ...newState.red, picks: ['0', '0', '0', '0', '0'], bans: ['0', '0', '0', '0', '0'] };
      }

      // Auto Trigger Intro ONLY on transition to State 3
      if (incomingGameState === 3 && lastGameStateRef.current !== 3) {
          console.log("Auto-Triggering Intro");
          newState.game = { ...newState.game, isIntroActive: true };
      }

      // Auto Save History on transition to State 7
      if (incomingGameState === 7 && lastGameStateRef.current !== 7) {
          console.log("Game State 7 Detected: Saving History...");
          
          // Determine Winner
          let winner = 'draw';
          if ((newState.blue.score || 0) > (newState.red.score || 0)) winner = 'blue';
          else if ((newState.red.score || 0) > (newState.blue.score || 0)) winner = 'red';

          const historyData = {
              matchTitle: currentState.game.matchTitle, // Save Match Name
              blue: newState.blue,
              red: newState.red,
              game: newState.game,
              winner: winner
          };
          
          fetch(`http://${window.location.hostname}:3000/api/save-history`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(historyData)
          }).then(r => r.json()).then(d => {
              console.log("History saved:", d);
          }).catch(e => console.error("History save failed", e));
      }
      
      // Update state history ONLY if meaningful (ignore 0/Lobby to prevent flicker loops)
      if (incomingGameState !== 0 && incomingGameState !== undefined && incomingGameState !== null) {
          lastGameStateRef.current = incomingGameState;
      }
      
      // OPTIMIZATION: Only update state if something actually changed on the server
      const hasChanged = !isTeamEqual(newState.blue, currentState.blue) ||
                         !isTeamEqual(newState.red, currentState.red) ||
                         newState.game.isIntroActive !== currentState.game.isIntroActive;

      if (hasChanged) {
          setDraft(newState);
          setState(newState); 
      }
  };

  const scanNetwork = async () => {
      // Just a placeholder or simple ping check to localhost
      try {
          const res = await fetch(`http://${window.location.hostname}:3000`);
          const data = await res.json();
          alert("Connected to Server: " + (data ? "OK" : "Error"));
      } catch (e) {
          console.error(e);
          alert("Server not reachable.");
      }
  };

  // --- HELPERS ---

  const updateDraftTeam = (side: 'blue' | 'red', field: string, value: any, index?: number) => {
    setDraft(prev => {
      const newDraft = { ...prev };
      const team = { ...newDraft[side] };
      if (index !== undefined && Array.isArray(team[field as keyof TeamData])) {
        const arr = [...(team[field as keyof TeamData] as string[])];
        arr[index] = value as string;
        (team[field as keyof TeamData] as string[]) = arr;
      } else {
        (team[field as keyof TeamData] as any) = value;
      }
      newDraft[side] = team;
      
      return newDraft;
    });
  };

  const handleGameWin = (winnerSide: 'blue' | 'red') => {
    const newScore = (draft[winnerSide].score || 0) + 1;
    const newState = {
        ...draft,
        [winnerSide]: { ...draft[winnerSide], score: newScore }
    };
    setDraft(newState);
    setState(newState);
  };

  // Import Teams handler
  const handleImportTeams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    const apiHost = window.location.hostname;
    
    try {
        const res = await fetch(`http://${apiHost}:3000/api/import-teams`, { 
            method: 'POST', 
            body: formData 
        });
        if (res.ok) {
            const result = await res.json();
            alert(result.message);
        } else {
            const err = await res.json();
            alert('Gagal impor: ' + err.message);
        }
    } catch (error) {
        console.error(error);
        alert('Terjadi kesalahan saat upload.');
    }
  };

  const handleImportAds = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    
    const apiHost = window.location.hostname;
    
    try {
        const res = await fetch(`http://${apiHost}:3000/api/import-ads`, { 
            method: 'POST', 
            body: formData 
        });
        if (res.ok) {
            const result = await res.json();
            alert(result.message);
            // Server broadcasts the state change, so no local state update is needed.
        } else {
            const err = await res.json();
            alert('Import failed: ' + err.message);
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred during upload.');
    }
    // Reset file input to allow uploading the same file again
    e.target.value = '';
  };

  const handleImageUpload = (side: 'blue' | 'red' | 'ads' | 'prepare', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (side === 'blue' || side === 'red') {
          updateDraftTeam(side, 'logo', base64);
      } else if (side === 'ads') {
          setDraft(prev => {
              const newState = { ...prev, ads: [...prev.ads, base64] };
              return newState;
          });
      } else if (side === 'prepare') {
          setNewTeamLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAd = (index: number) => {
    setDraft(prev => {
        const newState = { ...prev, ads: prev.ads.filter((_, i) => i !== index) };
        return newState;
    });
  };
  
  const addTeamToRegistry = () => {
    if (!newTeamName || !newTeamLeader) return;
    const newTeam: RegisteredTeam = { id: Date.now().toString(), name: newTeamName, leaderId: newTeamLeader, logo: newTeamLogo };
    
    // Update draft only
    setDraft(prev => {
        const updated = { ...prev, registry: [...(prev.registry || []), newTeam] };
        return updated;
    });
    
    setNewTeamName(''); setNewTeamLeader(''); setNewTeamLogo('');
  };
  
  const removeTeamFromRegistry = (id: string) => {
    // Update draft only
    setDraft(prev => {
        const updated = { ...prev, registry: (prev.registry || []).filter(t => t.id !== id) };
        return updated;
    });
  };

  const updateDraftAdConfig = (field: keyof AdConfig, value: any) => {
    setDraft(prev => ({ ...prev, adConfig: { ...prev.adConfig, [field]: value } }));
  };

  const updateLiveGame = (field: string, value: any) => {
    setState(prev => ({ ...prev, game: { ...prev.game, [field]: value } }));
    setDraft(prev => ({ ...prev, game: { ...prev.game, [field]: value } }));
  };

  const updateVisibility = (field: 'phase' | 'timer' | 'turn' | 'score' | 'isAutoSync') => {
    setDraft(prev => {
        const currentVis = prev.game.visibility || { phase: true, timer: true, turn: true, score: true };
        const newVis = { ...currentVis, [field]: !currentVis[field] };
        const newGame = { ...prev.game, visibility: newVis };
        setState(s => ({ ...s, game: newGame }));
        return { ...prev, game: newGame };
    });
  };

  const updateSyncControl = (field: keyof SyncControl) => {
    setDraft(prev => {
        const currentCtrl = prev.syncControl || { isBanSyncEnabled: true, isPickSyncEnabled: true, isGoldSyncEnabled: true, isTeamNameSyncEnabled: true };
        const newCtrl = { ...currentCtrl, [field]: !currentCtrl[field] };
        setState(s => ({ ...s, syncControl: newCtrl }));
        return { ...prev, syncControl: newCtrl };
    });
  };

  const applyTeamChanges = (side: 'blue' | 'red') => setState(prev => ({ ...prev, [side]: draft[side] }));
  const applyAdChanges = () => setState(prev => ({ ...prev, adConfig: draft.adConfig, ads: draft.ads }));
  const applyRegistryChanges = () => setState(prev => ({ ...prev, registry: draft.registry }));

  const isTeamDirty = (side: 'blue' | 'red') => JSON.stringify(state[side]) !== JSON.stringify(draft[side]);
  const isAdsDirty = () => JSON.stringify(state.adConfig) !== JSON.stringify(draft.adConfig) || JSON.stringify(state.ads) !== JSON.stringify(draft.ads);
  const isRegistryDirty = () => JSON.stringify(state.registry) !== JSON.stringify(draft.registry);

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- RENDERERS ---

  const renderAds = () => (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-amber-400 font-black uppercase tracking-widest mb-4">Ad Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ad Type</span>
            <select 
              value={draft.adConfig.type} 
              onChange={(e) => updateDraftAdConfig('type', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold"
            >
              <option value="text">Text Only</option>
              <option value="images">Image Gallery</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Animation Effect</span>
            <select 
              value={draft.adConfig.effect} 
              onChange={(e) => updateDraftAdConfig('effect', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold"
            >
              <option value="scroll">Marquee (Scroll)</option>
              <option value="fade">Fade Transition</option>
            </select>
          </div>
          {draft.adConfig.type === 'text' && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ad Text</span>
              <textarea 
                value={draft.adConfig.text} 
                onChange={(e) => updateDraftAdConfig('text', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold h-20"
                placeholder="Enter ticker text here..."
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Speed (Seconds / Duration)</span>
            <input 
              type="number" 
              value={draft.adConfig.speed} 
              onChange={(e) => updateDraftAdConfig('speed', parseInt(e.target.value) || 0)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          {isAdsDirty() && (
            <button onClick={applyAdChanges} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-black text-[10px] uppercase shadow-lg">
              Apply Ad Changes
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-amber-400 font-black uppercase tracking-widest">Ad Images</h3>
          <div className="flex items-center gap-2">
            <a href="/ads-template.zip" download className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg">
                <span>⬇️ TEMPLATE</span>
            </a>
            <label className="text-[10px] font-black bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg">
                <span>📂 IMPORT ZIP</span>
                <input type="file" accept=".zip" className="hidden" onChange={handleImportAds} />
            </label>
            <label className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg">
              <span>+ ADD IMAGE</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload('ads', e)} />
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {draft.ads.map((ad, idx) => (
            <div key={idx} className="relative group aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
              <img src={ad.startsWith('data:') ? ad : `/assets/${ad}.png`} className="w-full h-full object-contain" />
              <button 
                onClick={() => removeAd(idx)}
                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
          {draft.ads.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-600 italic text-xs">
              No images added. Ticker will be empty if "Image Gallery" is selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTeams = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {['blue', 'red'].map((side) => (
        <div key={side} className={`flex flex-col bg-slate-800/30 rounded-2xl border transition-all ${isTeamDirty(side as any) ? `border-${side}-500/50` : 'border-slate-700/50'}`}>
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3 flex-1">
              <div className={`w-2 h-6 bg-${side}-500 rounded-full`} />
              <div className="relative group/logo">
                {draft[side as 'blue' | 'red'].logo ? <img src={draft[side as 'blue' | 'red'].logo?.startsWith('assets/') ? '/' + draft[side as 'blue' | 'red'].logo : draft[side as 'blue' | 'red'].logo} className="w-8 h-8 rounded" /> : <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-[8px]">LOGO</div>}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(side as any, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              
              <div className="flex-1 flex flex-col relative">
                 <input 
                    list={`team-list-${side}`}
                    value={draft[side as 'blue' | 'red'].name} 
                    onChange={(e) => {
                       const val = e.target.value;
                       updateDraftTeam(side as any, 'name', val);
                       const libTeam = state.teamLibrary?.find(t => t.name === val);
                       if (libTeam) updateDraftTeam(side as any, 'logo', libTeam.logoUrl);
                    }} 
                    className="bg-transparent text-base font-black uppercase w-full focus:outline-none placeholder:text-slate-600" 
                    placeholder={`${side} TEAM`} 
                 />
                 <datalist id={`team-list-${side}`}>
                    {(state.teamLibrary || []).map(t => (
                       <option key={t.id} value={t.name}>{t.shortName}</option>
                    ))}
                 </datalist>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-900 rounded p-1 border border-slate-700 ml-2">
                 <button onClick={() => updateDraftTeam(side as any, 'score', Math.max(0, (draft[side as 'blue' | 'red'].score || 0) - 1))} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-black bg-slate-800 rounded text-[10px]">-</button>
                 <span className="text-white font-black w-4 text-center text-xs">{draft[side as 'blue' | 'red'].score || 0}</span>
                 <button onClick={() => updateDraftTeam(side as any, 'score', (draft[side as 'blue' | 'red'].score || 0) + 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-black bg-slate-800 rounded text-[10px]">+</button>
              </div>
            </div>
            
            <button 
              onClick={() => handleGameWin(side as any)}
              className="ml-2 text-[9px] font-black bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg active:scale-95 transition-all flex items-center gap-1"
            >
              <span className="text-xs">🏆</span> WIN
            </button>
            {isTeamDirty(side as any) && <button onClick={() => applyTeamChanges(side as any)} className="ml-2 text-[9px] font-black bg-white/10 px-3 py-1 rounded-full">APPLY</button>}
          </div>
          <div className="p-4 space-y-3">
             <div className="grid grid-cols-5 gap-1 mb-2">
                {draft[side as 'blue' | 'red'].bans.map((ban, i) => (
                  <input key={i} placeholder={`Ban ${i+1}`} value={ban} onChange={(e) => updateDraftTeam(side as any, 'bans', e.target.value, i)} className="bg-slate-900 border-slate-700 p-1.5 text-[10px] rounded text-center uppercase" />
                ))}
             </div>
             <div className="grid gap-2">
                {draft[side as 'blue' | 'red'].pNames.map((name, i) => (
                  <div key={i} className="flex gap-2 group">
                      <input value={draft[side as 'blue' | 'red'].picks[i]} onChange={(e) => updateDraftTeam(side as any, 'picks', e.target.value, i)} className="w-20 bg-slate-900 text-[10px] p-2 rounded uppercase" placeholder="Hero"/>
                      <div className="flex-1 flex flex-col">
                          <input value={name} onChange={(e) => updateDraftTeam(side as any, 'pNames', e.target.value, i)} className="w-full bg-slate-900 text-[10px] p-2 rounded-t uppercase" placeholder="Player"/>
                          {/* Player ID Display */}
                          <div className="bg-slate-950 text-[8px] text-slate-500 px-2 py-0.5 rounded-b border-t border-slate-800 font-mono select-all">
                              ID: {draft[side as 'blue' | 'red'].pIds?.[i] || 'N/A'}
                          </div>
                      </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderHistory = () => (
    <div className="flex flex-col gap-4">
        <h3 className="text-blue-400 font-black uppercase tracking-widest mb-2">Match History</h3>
        <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {state.history?.slice().reverse().map((match: any) => (
                <div key={match.id} className={`bg-slate-800/50 p-4 rounded-xl border ${match.winner === 'blue' ? 'border-blue-500/30' : match.winner === 'red' ? 'border-red-500/30' : 'border-slate-700'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-500 font-bold">{new Date(match.date).toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{match.matchTitle || 'MATCH'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className={`text-xl font-black ${match.winner === 'blue' ? 'text-blue-400' : 'text-slate-400'}`}>{match.blue.name}</span>
                            {match.winner === 'blue' && <span className="text-xs bg-blue-500 text-black px-2 py-0.5 rounded font-bold">WIN</span>}
                        </div>
                        <div className="flex items-center gap-4 text-2xl font-black text-white">
                            <span>{match.blue.score}</span>
                            <span className="text-slate-600">-</span>
                            <span>{match.red.score}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {match.winner === 'red' && <span className="text-xs bg-red-500 text-black px-2 py-0.5 rounded font-bold">WIN</span>}
                            <span className={`text-xl font-black ${match.winner === 'red' ? 'text-red-400' : 'text-slate-400'}`}>{match.red.name}</span>
                        </div>
                    </div>
                </div>
            ))}
            {(!state.history || state.history.length === 0) && <div className="text-center text-slate-600 text-xs italic py-10">No match history yet.</div>}
        </div>
    </div>
  );

  const renderNetwork = () => (
    <div className="flex flex-col gap-6">
       <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-blue-400 font-black uppercase tracking-widest mb-4">Network & Data Source</h3>
          <div className="flex flex-col gap-6">
             <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-white">Live Data Sync</span>
                    <span className="text-[10px] text-slate-500">Master switch for all automatic updates.</span>
                </div>
                <button 
                    onClick={() => updateVisibility('isAutoSync')} 
                    className={`px-4 py-2 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all shadow-lg ${state.game.visibility?.isAutoSync ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                >
                    {state.game.visibility?.isAutoSync ? 'ENABLED (AUTO)' : 'DISABLED (MANUAL)'}
                </button>
             </div>

             {/* Granular Sync Controls */}
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Granular Sync Controls</h4>

                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white font-bold">Pick Sync (Heroes)</span>
                    <button
                       onClick={() => updateSyncControl('isPickSyncEnabled')}
                       className={`w-8 h-4 rounded-full transition-colors ${state.syncControl?.isPickSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white font-bold">Ban Sync</span>
                    <button
                       onClick={() => updateSyncControl('isBanSyncEnabled')}
                       className={`w-8 h-4 rounded-full transition-colors ${state.syncControl?.isBanSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white font-bold">Team Name & Logo Auto-Match</span>
                    <button
                       onClick={() => updateSyncControl('isTeamNameSyncEnabled')}
                       className={`w-8 h-4 rounded-full transition-colors ${state.syncControl?.isTeamNameSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    />
                </div>
             </div>

             <div className="space-y-2">
                <div className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700/50">
                    <span className="text-xs font-bold text-slate-400">Server Connection</span>
                    <span className="text-xs font-black text-emerald-400">CONNECTED</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700/50">
                    <span className="text-xs font-bold text-slate-400">Game Data Flow</span>
                    {lastPacketTime ? (
                        <div className="text-right">
                            <div className="text-xs font-black text-blue-400">ACTIVE</div>
                            <div className="text-[9px] text-slate-500">Last: {lastPacketTime.toLocaleTimeString()}</div>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-slate-600 uppercase">WAITING FOR DATA...</span>
                    )}
                </div>
             </div>

             {!lastPacketTime && (
                 <div className="text-[10px] text-slate-500 italic text-center p-2 bg-slate-900/30 rounded">
                    If "Waiting for Data" persists, ensure ADB is connected and Zygisk module is active on the phone.
                 </div>
             )}
          </div>
       </div>
    </div>
  );

    const handleFactoryReset = async () => {

        if (confirm("WARNING: This will wipe ALL data including History, Team Library, Logos, and Settings.\n\nAre you sure you want to FACTORY RESET?")) {

            try {

                const res = await fetch(`http://${window.location.hostname}:3000/api/factory-reset`, { method: 'POST' });

                const data = await res.json();

                alert(data.message);

                window.location.reload(); // Reload to clear local state artifacts

            } catch (e) {

                console.error(e);

                alert("Factory Reset Failed");

            }

        }

    };

  

    const renderPrepare = () => (

      <div className={`bg-slate-800/30 rounded-2xl border p-6 transition-all duration-300 ${isRegistryDirty() ? 'border-purple-500/50 shadow-lg shadow-purple-500/5' : 'border-slate-700/50'}`}>

         <div className="flex justify-between items-center mb-6">

            <h3 className="text-purple-400 font-black uppercase tracking-widest">Team Registry & Data</h3>

            <div className="flex gap-2">

               <button onClick={handleFactoryReset} className="text-[10px] font-black bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full transition-all shadow-lg flex items-center gap-2">

                  <span>⚠️ FACTORY RESET</span>

               </button>

               <button onClick={() => downloadJson(state.teamLibrary, 'team-library.json')} className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full transition-all shadow-lg flex items-center gap-2">

                  <span>⬇️ EXPORT JSON</span>

               </button>

               <a href="/template.zip" download className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full transition-all shadow-lg flex items-center gap-2">

                  <span>⬇️ TEMPLATE</span>

               </a>

               <label className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full transition-all shadow-lg cursor-pointer flex items-center gap-2">

                  <span>📂 IMPORT ZIP</span>

                  <input type="file" accept=".zip" className="hidden" onChange={handleImportTeams} />

               </label>

               {isRegistryDirty() && <button onClick={applyRegistryChanges} className="text-[10px] font-black bg-purple-500 text-white px-4 py-1.5 rounded-full hover:bg-purple-400 transition-all shadow-lg">APPLY CHANGES</button>}

            </div>

         </div>
       <div className="flex flex-col gap-6">
         {(state.teamLibrary && state.teamLibrary.length > 0) && (<div className="bg-slate-900/50 p-4 rounded-xl border border-blue-500/30 space-y-2"><h4 className="text-xs font-bold text-blue-400 uppercase">Imported Team Library ({state.teamLibrary.length})</h4><div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">{state.teamLibrary.map(t => (<div key={t.id} className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-[10px] text-white flex items-center gap-2">{t.logoUrl && <img src={t.logoUrl.startsWith('assets/') ? '/' + t.logoUrl : t.logoUrl} className="w-4 h-4 object-contain" />}<span>{t.name}</span></div>))}</div></div>)}
         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4"><h4 className="text-xs font-bold text-slate-400 uppercase">Add New Team</h4><div className="flex flex-wrap gap-4 items-end"><div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Team Name</label><input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs font-semibold w-40" placeholder="Ex: EVOS LEGENDS" /></div><div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Leader ID / Trigger</label><input value={newTeamLeader} onChange={(e) => setNewTeamLeader(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs font-semibold w-40" placeholder="Ex: EVOS.REKT" /></div><div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Logo</label><div className="relative group">{newTeamLogo ? <img src={newTeamLogo} className="w-9 h-9 object-contain bg-black/20 rounded border border-slate-600" /> : <div className="w-9 h-9 bg-slate-800 border border-slate-600 rounded flex items-center justify-center text-[8px]">UP</div>}<input type="file" accept="image/*" onChange={(e) => handleImageUpload('prepare', e)} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div><button onClick={addTeamToRegistry} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-black uppercase tracking-wide">Add Team</button></div></div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{(draft.registry || []).map((team) => (<div key={team.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center justify-between group"><div className="flex items-center gap-3">{team.logo ? <img src={team.logo.startsWith('data:') ? team.logo : (team.logo.startsWith('assets/') ? '/' + team.logo : `/assets/${team.logo}.png`)} className="w-10 h-10 object-contain bg-black/20 rounded" /> : <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-[8px]">N/A</div>}<div className="flex flex-col"><span className="text-xs font-black text-white">{team.name}</span><span className="text-[9px] text-purple-400 font-bold uppercase">{team.leaderId}</span></div></div><button onClick={() => removeTeamFromRegistry(team.id)} className="text-slate-600 hover:text-red-500 transition-colors p-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></div>))}</div>
       </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-6 gap-6 overflow-hidden">
      {/* Top Bar Controls - Fixed */}
      <div className="flex flex-wrap items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phase</span>
            <select value={state.game.phase} onChange={(e) => updateLiveGame('phase', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 ring-blue-500 transition-all"><option>BANNING</option><option>PICKING</option><option>PREPARING</option><option>STARTING</option></select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Timer</span>
            <input type="number" value={state.game.timer} onChange={(e) => updateLiveGame('timer', parseInt(e.target.value) || 0)} className="w-20 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-bold text-center" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Match Name</span>
            <input type="text" value={draft.game.matchTitle || ''} onChange={(e) => updateLiveGame('matchTitle', e.target.value)} className="w-32 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-bold" placeholder="GRAND FINALS" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Turn</span>
            <div className="flex bg-slate-900 rounded border border-slate-700 p-0.5"><button onClick={() => updateLiveGame('turn', 'blue')} className={`px-4 py-1 rounded text-[10px] font-black transition-all ${state.game.turn === 'blue' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>BLUE</button><button onClick={() => updateLiveGame('turn', 'red')} className={`px-4 py-1 rounded text-[10px] font-black transition-all ${state.game.turn === 'red' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>RED</button></div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Sync Toggle */}
          <button onClick={() => updateVisibility('isAutoSync')} className={`px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all ${state.game.visibility?.isAutoSync ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}><div className={`w-2 h-2 rounded-full ${state.game.visibility?.isAutoSync ? 'bg-white' : 'bg-slate-500'}`}></div>{state.game.visibility?.isAutoSync ? 'LIVE SYNC ON' : 'SYNC OFF'}</button>
          
          {/* Visibility Toggles */}
          <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 mr-2"><span className="text-[8px] font-bold text-slate-500 px-1 uppercase">Show:</span><button onClick={() => updateVisibility('phase')} className={`px-2 py-1 rounded text-[9px] font-black uppercase ${state.game.visibility?.phase ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-600 hover:text-slate-400'}`}>Phase</button><button onClick={() => updateVisibility('timer')} className={`px-2 py-1 rounded text-[9px] font-black uppercase ${state.game.visibility?.timer ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-600 hover:text-slate-400'}`}>Timer</button><button onClick={() => updateVisibility('turn')} className={`px-2 py-1 rounded text-[9px] font-black uppercase ${state.game.visibility?.turn ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-600 hover:text-slate-400'}`}>Turn</button><button onClick={() => updateVisibility('score')} className={`px-2 py-1 rounded text-[9px] font-black uppercase ${state.game.visibility?.score ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-slate-600 hover:text-slate-400'}`}>Score</button></div>

          <button onClick={() => setState(prev => ({ ...prev, game: { ...prev.game, isIntroActive: true }}))} disabled={state.game.isIntroActive} className={`px-4 py-2 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all ${state.game.isIntroActive ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'}`}>{state.game.isIntroActive ? 'Intro Running' : 'Start Intro'}</button>
          <button onClick={handleApplyAll} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[10px] tracking-widest uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2">Publish All <span className="opacity-50 text-[8px] bg-black/20 px-1 rounded">CTRL+ENTER</span></button>
          <button onClick={resetState} className="ml-2 p-2 text-slate-500 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50">
        <button onClick={() => setActiveTab('teams')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'teams' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Teams & Players</button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'history' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Match History</button>
        <button onClick={() => setActiveTab('network')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'network' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Network & Sync</button>
        <button onClick={() => setActiveTab('ads')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'ads' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Ads & Sponsors</button>
        <button onClick={() => setActiveTab('prepare')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'prepare' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Prepare Data</button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'teams' ? renderTeams() :
         activeTab === 'history' ? renderHistory() :
         activeTab === 'network' ? renderNetwork() :
         activeTab === 'ads' ? renderAds() :
         activeTab === 'prepare' ? renderPrepare() : null}
      </div>
    </div>
  );
};

export default AdminPanel;
