import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, TeamData, AdConfig, RegisteredTeam, SyncControl, AppTheme } from '../types';

interface AdminPanelProps {
  state: AppState;
  setState: (newState: AppState | ((prev: AppState) => AppState)) => void;
  resetState: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ state, setState, resetState }) => {
  const [draft, setDraft] = useState<AppState>(state);
  const [activeTab, setActiveTab] = useState<'teams' | 'history' | 'ads' | 'prepare' | 'settings' | 'battle'>('teams');

  const GAME_STATE_LABELS: { [key: number]: string } = {
    0: 'GS_Non',
    1: 'GS_GameLobby',
    2: 'GS_Matching',
    3: 'GS_ChooseHero',
    4: 'GS_BattleLoading',
    5: 'GS_Battle',
    6: 'GS_Victory',
    7: 'GS_ClearingData',
    8: 'GS_GameOverSelfData',
    9: 'GS_GameOverAchievementData',
    10: 'GS_TeamMatch',
    11: 'GS_LevelUp',
    12: 'GS_BattleAchivementShare',
    13: 'GS_InviteFriend',
    14: 'GS_TenantMode',
    15: 'GS_MatchFail',
    16: 'GS_SurvivalEnd',
    17: 'GS_BattleEnd',
    18: 'GS_WaitDownloadAdd',
    19: 'GS_LogicBattleEnd',
    20: 'GS_SeniorShare',
    21: 'GS_StartBanPick',
    22: 'GS_EnterBattle',
    27: 'GS_RecInvite',
    100: 'GS_AUTOREPLAY',
    1000: 'GS_ParkGameLobby',
    1001: 'GS_ParkMatch',
    1002: 'GS_ParkClearing'
  };
  
  // Local state for the Prepare tab form
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeader, setNewTeamLeader] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<any[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Stats
  const [lastPacketTime, setLastPacketTime] = useState<Date | null>(null);

  // Helper to group matches
  const groupMatchesBySeries = (history: any[]) => {
      const groups: { [key: string]: any[] } = {};
      history.forEach(match => {
          const teams = [match.blue.name, match.red.name].sort().join(" vs ");
          const key = `${match.matchTitle}::${teams}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(match);
      });
      return groups;
  };

  // Helper for deep comparison
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
  const prevStateRef = useRef(state);

  useEffect(() => {
    const prev = prevStateRef.current;
    
    setDraft(currentDraft => {
        let nextDraft = { ...currentDraft };
        let hasChanges = false;

        // Sync Game Fields
        if (state.game.timer !== prev.game.timer) { nextDraft.game = { ...nextDraft.game, timer: state.game.timer }; hasChanges = true; }
        if (state.game.phase !== prev.game.phase) { nextDraft.game = { ...nextDraft.game, phase: state.game.phase }; hasChanges = true; }
        if (state.game.turn !== prev.game.turn) { nextDraft.game = { ...nextDraft.game, turn: state.game.turn }; hasChanges = true; }
        if (state.game.bestOf !== prev.game.bestOf) { nextDraft.game = { ...nextDraft.game, bestOf: state.game.bestOf }; hasChanges = true; }
        if (state.game.isIntroActive !== prev.game.isIntroActive) { nextDraft.game = { ...nextDraft.game, isIntroActive: state.game.isIntroActive }; hasChanges = true; }
        if (state.game.matchTitle !== prev.game.matchTitle) { nextDraft.game = { ...nextDraft.game, matchTitle: state.game.matchTitle }; hasChanges = true; }
        if (JSON.stringify(state.game.visibility) !== JSON.stringify(prev.game.visibility)) { nextDraft.game = { ...nextDraft.game, visibility: state.game.visibility }; hasChanges = true; }

        // Sync Teams
        if (!isTeamEqual(state.blue, prev.blue)) { nextDraft.blue = state.blue; hasChanges = true; }
        if (!isTeamEqual(state.red, prev.red)) { nextDraft.red = state.red; hasChanges = true; }

        // Sync Configs
        if (JSON.stringify(state.ads) !== JSON.stringify(prev.ads)) { nextDraft.ads = state.ads; hasChanges = true; }
        if (JSON.stringify(state.adConfig) !== JSON.stringify(prev.adConfig)) { nextDraft.adConfig = state.adConfig; hasChanges = true; }
        if (JSON.stringify(state.syncControl) !== JSON.stringify(prev.syncControl)) { nextDraft.syncControl = state.syncControl; hasChanges = true; }
        if (JSON.stringify(state.registry) !== JSON.stringify(prev.registry)) { nextDraft.registry = state.registry; hasChanges = true; }
        if (JSON.stringify(state.history) !== JSON.stringify(prev.history)) { nextDraft.history = state.history; hasChanges = true; }
        if (JSON.stringify(state.theme) !== JSON.stringify(prev.theme)) { nextDraft.theme = state.theme; hasChanges = true; }

        return hasChanges ? nextDraft : currentDraft;
    });

    prevStateRef.current = state;
  }, [state]);

  // --- LIVE DATA PROCESSING ---
  useEffect(() => {
    if (state.gameData) {
        setLastPacketTime(new Date());
    }
  }, [state.gameData]);

  const latestDraftRef = useRef(draft);
  const lastGameStateRef = useRef<number | null>(null);
  const savingLockRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);
  
  useEffect(() => { latestDraftRef.current = draft; }, [draft]);

  // Main Logic for Game State Transitions
  useEffect(() => {
      const incomingGameState = state.gameData?.debug?.game_state;
      
      // We only care if game state changes
      if (incomingGameState === lastGameStateRef.current) return;
      if (incomingGameState === undefined || incomingGameState === null) return;

      console.log(`Game State Transition: ${lastGameStateRef.current} -> ${incomingGameState}`);

      const currentState = state;

      // 1. Auto Save History (State 6 -> 7)
      const now = Date.now();
      if (lastGameStateRef.current === 6 && incomingGameState === 7) {
          if (!savingLockRef.current && (now - lastSaveTimeRef.current > 15000)) {
              console.log("Match Finished (6->7). Saving History...");
              savingLockRef.current = true;
              lastSaveTimeRef.current = now;
              
              let winner = 'draw';
              const blueScore = currentState.blue.score || 0;
              const redScore = currentState.red.score || 0;
              
              if (blueScore > redScore) winner = 'blue';
              else if (redScore > blueScore) winner = 'red';

              const historyData = {
                  matchTitle: currentState.game.matchTitle,
                  blue: currentState.blue,
                  red: currentState.red,
                  game: currentState.game,
                  gameData: currentState.gameData,
                  winner: winner,
                  date: new Date().toISOString()
              };
              
              const apiHost = window.location.hostname;
              fetch(`http://${apiHost}:3000/api/save-history`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(historyData)
              }).then(r => r.json()).then(d => {
                  console.log("History saved successfully:", d);
              }).catch(e => console.error("History save failed", e))
              .finally(() => {
                  setTimeout(() => { savingLockRef.current = false; }, 2000);
              });
          }
      }

      // 2. Auto Intro (State -> 3)
      if (incomingGameState === 3 && lastGameStateRef.current !== 3) {
          setState(prev => ({ ...prev, game: { ...prev.game, isIntroActive: true } }));
      }

      lastGameStateRef.current = incomingGameState;
  }, [state.gameData?.debug?.game_state, setState, state]);


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

  const updateTheme = (field: keyof AppTheme, value: string) => {
      setDraft(prev => {
          const newTheme = { ...(prev.theme || {}), [field]: value };
          setState(s => ({ ...s, theme: newTheme as AppTheme }));
          return { ...prev, theme: newTheme as AppTheme };
      });
  };

  const handleImportTeams = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const apiHost = window.location.hostname;
    try {
        await fetch(`http://${apiHost}:3000/api/import-teams`, { method: 'POST', body: formData });
        alert("Teams imported!");
    } catch (error) { console.error(error); alert('Error importing teams.'); }
  };

  const handleImportAds = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const apiHost = window.location.hostname;
    try {
        await fetch(`http://${apiHost}:3000/api/import-ads`, { method: 'POST', body: formData });
        alert("Ads imported!");
    } catch (error) { console.error(error); alert('Error importing ads.'); }
    e.target.value = '';
  };

  const handleImportHistory = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              const { id, ...matchData } = json; // Remove ID to force new entry or let backend handle it
              
              const apiHost = window.location.hostname;
              const res = await fetch(`http://${apiHost}:3000/api/save-history`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(matchData)
              });
              
              if (res.ok) alert("Match history imported successfully!");
              else alert("Failed to import history.");
          } catch (err) {
              console.error(err);
              alert("Invalid JSON file.");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleImageUpload = (side: 'blue' | 'red' | 'ads' | 'prepare', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (side === 'ads') {
        const newAds: string[] = [];
        let processedCount = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                newAds.push(event.target?.result as string);
                processedCount++;
                if (processedCount === files.length) {
                    setDraft(prev => ({ ...prev, ads: [...prev.ads, ...newAds] }));
                }
            };
            reader.readAsDataURL(file);
        });
    } else {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (side === 'blue' || side === 'red') updateDraftTeam(side, 'logo', base64);
            else if (side === 'prepare') setNewTeamLogo(base64);
        };
        reader.readAsDataURL(file);
    }
  };

  const removeAd = (index: number) => setDraft(prev => ({ ...prev, ads: prev.ads.filter((_, i) => i !== index) }));
  
  const handleSaveRegistryTeam = () => {
    if (!newTeamName || !newTeamLeader) return;

    if (editingTeamId) {
        // Update Existing
        setDraft(prev => ({
            ...prev,
            registry: (prev.registry || []).map(t => 
                t.id === editingTeamId 
                ? { ...t, name: newTeamName, leaderId: newTeamLeader, logo: newTeamLogo }
                : t
            )
        }));
        setEditingTeamId(null);
    } else {
        // Add New
        const newTeam: RegisteredTeam = { id: Date.now().toString(), name: newTeamName, leaderId: newTeamLeader, logo: newTeamLogo };
        setDraft(prev => ({ ...prev, registry: [...(prev.registry || []), newTeam] }));
    }
    setNewTeamName(''); setNewTeamLeader(''); setNewTeamLogo('');
  };

  const startEditingTeam = (team: RegisteredTeam) => {
      setEditingTeamId(team.id);
      setNewTeamName(team.name);
      setNewTeamLeader(team.leaderId);
      setNewTeamLogo(team.logo);
  };

  const cancelEditingTeam = () => {
      setEditingTeamId(null);
      setNewTeamName(''); setNewTeamLeader(''); setNewTeamLogo('');
  };
  
  const removeTeamFromRegistry = (id: string) => {
      if (editingTeamId === id) cancelEditingTeam();
      setDraft(prev => ({ ...prev, registry: (prev.registry || []).filter(t => t.id !== id) }));
  };
  const updateDraftAdConfig = (field: keyof AdConfig, value: any) => setDraft(prev => ({ ...prev, adConfig: { ...prev.adConfig, [field]: value } }));
  const updateLiveGame = (field: string, value: any) => {
    setState(prev => ({ ...prev, game: { ...prev.game, [field]: value } }));
    setDraft(prev => ({ ...prev, game: { ...prev.game, [field]: value } }));
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
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const handleFactoryReset = async () => {
        if (confirm("WARNING: This will wipe ALL data including Team Library, Logos, and Settings.\n\nAre you sure you want to FACTORY RESET?")) {
            try {
                const res = await fetch(`http://${window.location.hostname}:3000/api/factory-reset`, { method: 'POST' });
                const data = await res.json();
                alert(data.message);
                window.location.reload();
            } catch (e) { console.error(e); alert("Factory Reset Failed"); }
        }
  };

  const updateHistoryItem = async (match: any) => {
      try {
          const res = await fetch(`http://${window.location.hostname}:3000/api/update-history`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(match)
          });
          const d = await res.json();
          
          // Update local state
          const newHistory = state.history.map(m => m.id === match.id ? match : m);
          setState(prev => ({ ...prev, history: newHistory }));
          setDraft(prev => ({ ...prev, history: newHistory }));
          
          // Update the modal view
          setSelectedSeries(prev => prev.map(m => m.id === match.id ? match : m));
          setEditingMatchId(null);
          
      } catch (e) { console.error(e); alert("Failed to update match."); }
  };

  const deleteHistoryItem = async (matchId: string) => {
      if (!confirm("Are you sure you want to delete this match record?")) return;
      try {
          const res = await fetch(`http://${window.location.hostname}:3000/api/delete-history`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: matchId })
          });
          
          if (res.ok) {
              // Update local state
              const newHistory = state.history.filter(m => m.id !== matchId);
              setState(prev => ({ ...prev, history: newHistory }));
              setDraft(prev => ({ ...prev, history: newHistory }));
              
              // Update the modal view
              const newSeries = selectedSeries.filter(m => m.id !== matchId);
              setSelectedSeries(newSeries);
              
              // If series is empty, close modal
              if (newSeries.length === 0) {
                  setShowHistoryModal(false);
              }
          } else {
              alert("Failed to delete match.");
          }
      } catch (e) { console.error(e); alert("Failed to delete match."); }
  };

  const renderBattle = () => {
      const stats = state.gameData?.data?.battle_stats;
      return (
        <div className="flex flex-col gap-6">
            {/* Header / Scoreboard */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-transparent to-red-900/20 pointer-events-none"/>
                
                {/* Blue Team Stats */}
                <div className="flex flex-col items-center z-10 w-1/3">
                    <span className="text-2xl font-black text-blue-400 mb-2">{state.blue.name}</span>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center p-3 bg-slate-900 rounded-xl border border-blue-500/30 w-24">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">KILLS</span>
                            <span className="text-4xl font-black text-white">{state.blue.kills}</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-slate-900 rounded-xl border border-slate-700 w-24">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">GOLD</span>
                            <span className="text-xl font-bold text-amber-400">{(stats?.m_CampAGold || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-slate-900 rounded-xl border border-slate-700 w-20">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">TOWER</span>
                            <span className="text-xl font-bold text-white">{stats?.m_CampAKillTower || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Center Timer */}
                <div className="flex flex-col items-center z-10">
                    <div className="bg-slate-950 px-6 py-2 rounded-full border border-slate-800 mb-2">
                        <span className="text-3xl font-mono font-black text-white">
                            {Math.floor((stats?.time || 0) / 60).toString().padStart(2, '0')}:
                            {Math.floor((stats?.time || 0) % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse">LIVE BATTLE</span>
                </div>

                {/* Red Team Stats */}
                <div className="flex flex-col items-center z-10 w-1/3">
                    <span className="text-2xl font-black text-red-400 mb-2">{state.red.name}</span>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center p-3 bg-slate-900 rounded-xl border border-slate-700 w-20">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">TOWER</span>
                            <span className="text-xl font-bold text-white">{stats?.m_CampBKillTower || 0}</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-slate-900 rounded-xl border border-slate-700 w-24">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">GOLD</span>
                            <span className="text-xl font-bold text-amber-400">{(stats?.m_CampBGold || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-center p-3 bg-slate-900 rounded-xl border border-red-500/30 w-24">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">KILLS</span>
                            <span className="text-4xl font-black text-white">{state.red.kills}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Objective Stats (Optional/Placeholder) */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Objective Control</h4>
                    <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded mb-2">
                        <span className="text-xs font-bold text-purple-400">Lord Kills</span>
                        <div className="flex gap-4">
                            <span className="text-blue-400 font-bold">{stats?.m_CampAKillLingZhu || 0}</span>
                            <span className="text-slate-600">-</span>
                            <span className="text-red-400 font-bold">{stats?.m_CampBKillLingZhu || 0}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                        <span className="text-xs font-bold text-emerald-400">Turtle Kills</span>
                        <div className="flex gap-4">
                            <span className="text-blue-400 font-bold">{stats?.m_CampAKillShenGui || 0}</span>
                            <span className="text-slate-600">-</span>
                            <span className="text-red-400 font-bold">{stats?.m_CampBKillShenGui || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                     <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Game Info</h4>
                     <div className="grid grid-cols-2 gap-2 text-xs">
                         <span className="text-slate-500">Game State:</span>
                         <span className="text-white font-bold">{state.gameData?.debug?.game_state}</span>
                         <span className="text-slate-500">Battle Time:</span>
                         <span className="text-white font-bold">{stats?.time?.toFixed(1)}s</span>
                     </div>
                </div>
            </div>

            {/* --- KILL SIMULATION --- */}
            <div className="bg-slate-800/30 p-6 rounded-2xl border border-slate-700">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                    Kill Simulation Trigger
                </h3>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            // Step 1: Ensure we are in State 6 first with a base player if needed
                            setState(prev => {
                                const newLogicPlayers = prev.gameData?.data?.logic_players ? [...prev.gameData.data.logic_players] : [];
                                if (newLogicPlayers.length === 0) {
                                    newLogicPlayers.push({ m_ID: 1, totalGold: 0, _DoubleKillTimes: 0, _TripleKillTimes: 0, _QuadraKillTimes: 0, _PentaKillTimes: 0, m_TotalExp: 0 });
                                }
                                
                                const newRoomPlayers = prev.gameData?.data?.room_info?.players ? [...prev.gameData.data.room_info.players] : [];
                                if (!newRoomPlayers.find(p => p.heroid === 1)) {
                                    newRoomPlayers.push({ lUid: 123, _sName: "Pro Player", iCamp: 1, heroid: 1, uiRankLevel: 1, summonSkillId: 0, banHero: 0, iRoad: 0, uiZoneId: 0, heroskin: 0 });
                                }

                                return {
                                    ...prev,
                                    gameData: {
                                        ...prev.gameData,
                                        debug: { ...prev.gameData?.debug, game_state: 6 },
                                        data: {
                                            ...prev.gameData?.data,
                                            logic_players: newLogicPlayers,
                                            room_info: { ...prev.gameData?.data?.room_info, players: newRoomPlayers }
                                        }
                                    }
                                };
                            });

                            // Step 2: Increment after a short delay to allow React to process the state change (Ref init)
                            setTimeout(() => {
                                setState(prev => {
                                    const newLogicPlayers = [...(prev.gameData?.data?.logic_players || [])];
                                    if (newLogicPlayers.length > 0) {
                                        newLogicPlayers[0] = {
                                            ...newLogicPlayers[0],
                                            _DoubleKillTimes: (newLogicPlayers[0]._DoubleKillTimes || 0) + 1
                                        };
                                    }
                                    return {
                                        ...prev,
                                        gameData: {
                                            ...prev.gameData,
                                            data: {
                                                ...prev.gameData?.data,
                                                logic_players: newLogicPlayers
                                            }
                                        }
                                    };
                                });
                            }, 100);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded font-bold text-xs uppercase shadow-lg transform active:scale-95 transition-all"
                    >
                        Trigger Double Kill
                    </button>
                    
                    <button
                        onClick={() => {
                            // Step 1: Ensure State 6
                            setState(prev => {
                                const newLogicPlayers = prev.gameData?.data?.logic_players ? [...prev.gameData.data.logic_players] : [];
                                if (newLogicPlayers.length === 0) {
                                     newLogicPlayers.push({ m_ID: 1, totalGold: 0, _DoubleKillTimes: 0, _TripleKillTimes: 0, _QuadraKillTimes: 0, _PentaKillTimes: 0, m_TotalExp: 0 });
                                }
                                
                                const newRoomPlayers = prev.gameData?.data?.room_info?.players ? [...prev.gameData.data.room_info.players] : [];
                                if (!newRoomPlayers.find(p => p.heroid === 1)) {
                                    newRoomPlayers.push({ lUid: 123, _sName: "MVP Player", iCamp: 1, heroid: 1, uiRankLevel: 1, summonSkillId: 0, banHero: 0, iRoad: 0, uiZoneId: 0, heroskin: 0 });
                                }

                                return {
                                    ...prev,
                                    gameData: {
                                        ...prev.gameData,
                                        debug: { ...prev.gameData?.debug, game_state: 6 },
                                        data: {
                                            ...prev.gameData?.data,
                                            logic_players: newLogicPlayers,
                                            room_info: { ...prev.gameData?.data?.room_info, players: newRoomPlayers }
                                        }
                                    }
                                }
                            });

                            // Step 2: Increment
                            setTimeout(() => {
                                setState(prev => {
                                    const newLogicPlayers = [...(prev.gameData?.data?.logic_players || [])];
                                    if (newLogicPlayers.length > 0) {
                                        newLogicPlayers[0] = {
                                            ...newLogicPlayers[0],
                                            _PentaKillTimes: (newLogicPlayers[0]._PentaKillTimes || 0) + 1
                                        };
                                    }
                                    return {
                                        ...prev,
                                        gameData: {
                                            ...prev.gameData,
                                            data: {
                                                ...prev.gameData?.data,
                                                logic_players: newLogicPlayers
                                            }
                                        }
                                    };
                                });
                            }, 100);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded font-bold text-xs uppercase shadow-lg transform active:scale-95 transition-all"
                    >
                        Trigger Savage
                    </button>
                </div>
            </div>
        </div>
      );
  };

  // --- RENDERERS ---

  const renderAds = () => (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-amber-400 font-black uppercase tracking-widest mb-4">Ad Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ad Type</span>
            <select value={draft.adConfig.type} onChange={(e) => updateDraftAdConfig('type', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold"><option value="text">Text Only</option><option value="images">Image Gallery</option></select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Animation Effect</span>
            <select value={draft.adConfig.effect} onChange={(e) => updateDraftAdConfig('effect', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold"><option value="scroll">Marquee (Scroll)</option><option value="fade">Fade Transition</option></select>
          </div>
          {draft.adConfig.type === 'text' && (<div className="flex flex-col gap-1 md:col-span-2"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ad Text</span><textarea value={draft.adConfig.text} onChange={(e) => updateDraftAdConfig('text', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold h-20" placeholder="Enter ticker text here..." /></div>)}
          <div className="flex flex-col gap-1"><span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Speed (Seconds / Duration)</span><input type="number" value={draft.adConfig.speed} onChange={(e) => updateDraftAdConfig('speed', parseInt(e.target.value) || 0)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold" /></div>
          <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Background Color</span>
              <div className="flex gap-2">
                  <input type="color" value={draft.adConfig.backgroundColor || '#18252C'} onChange={(e) => updateDraftAdConfig('backgroundColor', e.target.value)} className="h-8 w-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                  <input type="text" value={draft.adConfig.backgroundColor || '#18252C'} onChange={(e) => updateDraftAdConfig('backgroundColor', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-bold w-full uppercase" />
              </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">{isAdsDirty() && (<button onClick={applyAdChanges} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-black text-[10px] uppercase shadow-lg">Apply Ad Changes</button>)}
        </div>
      </div>
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-amber-400 font-black uppercase tracking-widest">Ad Images</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => { if(confirm('Are you sure you want to remove ALL ads?')) setDraft(prev => ({...prev, ads: []})); }} className="text-[10px] font-black bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg"><span>🗑️ CLEAR ALL</span></button>
            <a href="/ads-template.zip" download className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg"><span>⬇️ TEMPLATE</span></a>
            <label className="text-[10px] font-black bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg"><span>📂 IMPORT ZIP</span><input type="file" accept=".zip" className="hidden" onChange={handleImportAds} /></label>
            <label className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg"><span>+ ADD IMAGE</span><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload('ads', e)} /></label>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {draft.ads.map((ad, idx) => (<div key={idx} className="relative group aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700"><img src={ad.startsWith('data:') ? ad : `/assets/${ad}.png`} className="w-full h-full object-contain" /><button onClick={() => removeAd(idx)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>))}
          {draft.ads.length === 0 && (<div className="col-span-full py-10 text-center text-slate-600 italic text-xs">No images added. Ticker will be empty if "Image Gallery" is selected.</div>)}
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
                 <input list={`team-list-${side}`} value={draft[side as 'blue' | 'red'].name} onChange={(e) => { const val = e.target.value; updateDraftTeam(side as any, 'name', val); const libTeam = state.teamLibrary?.find(t => t.name === val); if (libTeam) updateDraftTeam(side as any, 'logo', libTeam.logoUrl); }} className="bg-transparent text-base font-black uppercase w-full focus:outline-none placeholder:text-slate-600" placeholder={`${side} TEAM`} />
                 <datalist id={`team-list-${side}`}>{(state.teamLibrary || []).map(t => (<option key={t.id} value={t.name}>{t.shortName}</option>))}</datalist>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 rounded p-1 border border-slate-700 ml-2">
                 <button onClick={() => updateDraftTeam(side as any, 'kills', Math.max(0, (draft[side as 'blue' | 'red'].kills || 0) - 1))} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-black bg-slate-800 rounded text-[10px]">-</button>
                 <span className="text-white font-black w-4 text-center text-xs">{draft[side as 'blue' | 'red'].kills || 0}</span>
                 <button onClick={() => updateDraftTeam(side as any, 'kills', (draft[side as 'blue' | 'red'].kills || 0) + 1)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white font-black bg-slate-800 rounded text-[10px]">+</button>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1 ml-4">
                <span className="text-[8px] font-bold text-slate-500 uppercase">Series Score</span>
                <div className="flex gap-1">
                    {Array.from({ length: Math.ceil(state.game.bestOf / 2) }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-4 rounded-full ${i < draft[side as 'blue' | 'red'].score ? (side === 'blue' ? 'bg-cyan-400' : 'bg-red-500') : 'bg-slate-700'}`} />
                    ))}
                </div>
            </div>

            <button onClick={() => handleGameWin(side as any)} className="ml-2 text-[9px] font-black bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg active:scale-95 transition-all flex items-center gap-1"><span className="text-xs">🏆</span> WIN</button>
            {isTeamDirty(side as any) && <button onClick={() => applyTeamChanges(side as any)} className="ml-2 text-[9px] font-black bg-white/10 px-3 py-1 rounded-full">APPLY</button>}
          </div>
          <div className="p-4 space-y-3">
             <div className="grid grid-cols-5 gap-1 mb-2">{draft[side as 'blue' | 'red'].bans.map((ban, i) => (<input key={i} placeholder={`Ban ${i+1}`} value={ban} onChange={(e) => updateDraftTeam(side as any, 'bans', e.target.value, i)} className="bg-slate-900 border-slate-700 p-1.5 text-[10px] rounded text-center uppercase" />))}</div>
             <div className="grid gap-2">{draft[side as 'blue' | 'red'].pNames.map((name, i) => (<div key={i} className="flex gap-2 group"><input value={draft[side as 'blue' | 'red'].picks[i]} onChange={(e) => updateDraftTeam(side as any, 'picks', e.target.value, i)} className="w-20 bg-slate-900 text-[10px] p-2 rounded uppercase" placeholder="Hero"/><div className="flex-1 flex flex-col"><input value={name} onChange={(e) => updateDraftTeam(side as any, 'pNames', e.target.value, i)} className="w-full bg-slate-900 text-[10px] p-2 rounded-t uppercase" placeholder="Player"/><div className="bg-slate-950 text-[8px] text-slate-500 px-2 py-0.5 rounded-b border-t border-slate-800 font-mono select-all">ID: {draft[side as 'blue' | 'red'].pIds?.[i] || 'N/A'}</div></div></div>))}
</div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderHistory = () => {
    const groupedHistory = groupMatchesBySeries(state.history || []);
    const sortedKeys = Object.keys(groupedHistory).sort().reverse();

    return (
    <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-blue-400 font-black uppercase tracking-widest">Match Series History</h3>
            <label className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full cursor-pointer transition-all shadow-lg flex items-center gap-2">
                <span>📂 IMPORT MATCH</span>
                <input type="file" accept=".json" className="hidden" onChange={handleImportHistory} />
            </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar p-1">
            {sortedKeys.map((key) => {
                const matches = groupedHistory[key];
                const latestMatch = matches[matches.length - 1];
                const [teamA, teamB] = key.split('::')[1].split(' vs ');
                
                let scoreA = 0;
                let scoreB = 0;

                matches.forEach(m => {
                    const winnerName = m.winner === 'blue' ? m.blue.name : (m.winner === 'red' ? m.red.name : '');
                    if (winnerName === teamA) scoreA++;
                    if (winnerName === teamB) scoreB++;
                });

                return (
                <div key={key} onClick={() => { setSelectedSeries(matches); setShowHistoryModal(true); }} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 cursor-pointer hover:bg-slate-800 hover:border-blue-500/50 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-bold">{new Date(latestMatch.date).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">{latestMatch.matchTitle || 'UNRANKED'}</span>
                        </div>
                        <div className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-slate-300">
                            BO {latestMatch.game?.bestOf || '?'}
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xs font-black text-white text-center mb-1">{teamA}</span>
                            <span className={`text-2xl font-black ${scoreA > scoreB ? 'text-emerald-400' : 'text-slate-500'}`}>{scoreA}</span>
                        </div>
                        
                        <div className="flex flex-col items-center px-4">
                            <span className="text-[10px] font-bold text-slate-600">VS</span>
                            <span className="text-[9px] text-slate-500 mt-1">{matches.length} Games</span>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                            <span className="text-xs font-black text-white text-center mb-1">{teamB}</span>
                            <span className={`text-2xl font-black ${scoreB > scoreA ? 'text-emerald-400' : 'text-slate-500'}`}>{scoreB}</span>
                        </div>
                    </div>
                </div>
                );
            })}
            {sortedKeys.length === 0 && <div className="text-center text-slate-600 text-xs italic py-10 col-span-full">No match history yet. Finish a game (State 7) to auto-save.</div>}
        </div>

        {/* SERIES DETAIL MODAL */}
        {showHistoryModal && selectedSeries.length > 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
                <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl p-6 shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
                    <button className="absolute top-4 right-4 text-slate-500 hover:text-white" onClick={() => setShowHistoryModal(false)}>✕</button>
                    
                    <div className="mb-6 border-b border-slate-800 pb-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider">{selectedSeries[0].matchTitle}</h3>
                        <span className="text-xs text-slate-500 font-bold">Series History • {selectedSeries.length} Games Played</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {selectedSeries.map((match, idx) => (
                            <div key={match.id} className="bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-blue-400">GAME {idx + 1}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => deleteHistoryItem(match.id)} className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 px-3 py-1 rounded">Delete</button>
                                        <button onClick={() => downloadJson(match, `match-${match.id}.json`)} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded">Export JSON</button>
                                        <button onClick={() => setEditingMatchId(editingMatchId === match.id ? null : match.id)} className={`text-[10px] px-3 py-1 rounded font-bold ${editingMatchId === match.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                                            {editingMatchId === match.id ? 'Cancel Edit' : 'Edit Details'}
                                        </button>
                                    </div>
                                </div>

                                {editingMatchId === match.id ? (
                                    <div className="space-y-4 bg-slate-900 p-4 rounded-lg border border-slate-700">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-slate-500">Winner</label>
                                                <select 
                                                    value={match.winner} 
                                                    onChange={(e) => {
                                                        const updated = { ...match, winner: e.target.value };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }}
                                                    className="w-full bg-slate-800 border-slate-600 rounded text-xs p-2 mt-1"
                                                >
                                                    <option value="blue">Blue Team ({match.blue.name})</option>
                                                    <option value="red">Red Team ({match.red.name})</option>
                                                    <option value="draw">Draw</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-slate-500">Scores</label>
                                                <div className="flex gap-2 mt-1">
                                                    <input type="number" value={match.blue.score} onChange={(e) => {
                                                        const updated = { ...match, blue: { ...match.blue, score: parseInt(e.target.value) } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-16 bg-slate-800 border-slate-600 rounded text-xs p-2 text-center text-blue-400"/>
                                                    <span className="text-slate-500 self-center">-</span>
                                                    <input type="number" value={match.red.score} onChange={(e) => {
                                                        const updated = { ...match, red: { ...match.red, score: parseInt(e.target.value) } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-16 bg-slate-800 border-slate-600 rounded text-xs p-2 text-center text-red-400"/>
                                                </div>
                                            </div>
                                        </div>

                                        {/* BANS EDIT */}
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Blue Bans</label>
                                                <div className="flex gap-1">
                                                    {match.blue.bans.map((ban: string, i: number) => (
                                                        <input 
                                                            key={i} 
                                                            value={ban} 
                                                            onChange={(e) => {
                                                                const newBans = [...match.blue.bans];
                                                                newBans[i] = e.target.value;
                                                                const updated = { ...match, blue: { ...match.blue, bans: newBans } };
                                                                setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                            }}
                                                            className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1 text-center"
                                                            placeholder="ID"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Red Bans</label>
                                                <div className="flex gap-1">
                                                    {match.red.bans.map((ban: string, i: number) => (
                                                        <input 
                                                            key={i} 
                                                            value={ban} 
                                                            onChange={(e) => {
                                                                const newBans = [...match.red.bans];
                                                                newBans[i] = e.target.value;
                                                                const updated = { ...match, red: { ...match.red, bans: newBans } };
                                                                setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                            }}
                                                            className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1 text-center"
                                                            placeholder="ID"
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* PICKS EDIT */}
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] uppercase font-bold text-slate-500 block">Blue Picks</label>
                                                {match.blue.pNames.map((pName: string, i: number) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input 
                                                            value={match.blue.picks[i]} 
                                                            onChange={(e) => {
                                                                const newPicks = [...match.blue.picks];
                                                                newPicks[i] = e.target.value;
                                                                const updated = { ...match, blue: { ...match.blue, picks: newPicks } };
                                                                setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                            }}
                                                            className="w-10 bg-slate-800 border-slate-600 rounded text-[10px] p-1 text-center"
                                                            placeholder="Hero"
                                                        />
                                                        <input 
                                                            value={pName} 
                                                            onChange={(e) => {
                                                                const newNames = [...match.blue.pNames];
                                                                newNames[i] = e.target.value;
                                                                const updated = { ...match, blue: { ...match.blue, pNames: newNames } };
                                                                setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                            }}
                                                            className="flex-1 bg-slate-800 border-slate-600 rounded text-[10px] p-1"
                                                            placeholder="Player Name"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] uppercase font-bold text-slate-500 block">Red Picks</label>
                                                {match.red.pNames.map((pName: string, i: number) => (
                                                    <div key={i} className="flex gap-2">
                                                        <input 
                                                            value={match.red.picks[i]} 
                                                            onChange={(e) => {
                                                                const newPicks = [...match.red.picks];
                                                                newPicks[i] = e.target.value;
                                                                const updated = { ...match, red: { ...match.red, picks: newPicks } };
                                                                setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                            }}
                                                            className="w-10 bg-slate-800 border-slate-600 rounded text-[10px] p-1 text-center"
                                                            placeholder="Hero"
                                                        />
                                                        <input 
                                                            value={pName} 
                                                            onChange={(e) => {
                                                                const newNames = [...match.red.pNames];
                                                                newNames[i] = e.target.value;
                                                                const updated = { ...match, red: { ...match.red, pNames: newNames } };
                                                                setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                            }}
                                                            className="flex-1 bg-slate-800 border-slate-600 rounded text-[10px] p-1"
                                                            placeholder="Player Name"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* BATTLE STATS EDIT */}
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] uppercase font-bold text-slate-500 block mb-2">Blue Battle Stats</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><span className="text-[8px] text-slate-600 block">Gold</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampAGold || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampAGold: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                    <div><span className="text-[8px] text-slate-600 block">Tower</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampAKillTower || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampAKillTower: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                    <div><span className="text-[8px] text-slate-600 block">Lord</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampAKillLingZhu || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampAKillLingZhu: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                    <div><span className="text-[8px] text-slate-600 block">Turtle</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampAKillShenGui || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampAKillShenGui: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] uppercase font-bold text-slate-500 block mb-2">Red Battle Stats</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div><span className="text-[8px] text-slate-600 block">Gold</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampBGold || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampBGold: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                    <div><span className="text-[8px] text-slate-600 block">Tower</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampBKillTower || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampBKillTower: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                    <div><span className="text-[8px] text-slate-600 block">Lord</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampBKillLingZhu || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampBKillLingZhu: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                    <div><span className="text-[8px] text-slate-600 block">Turtle</span><input type="number" value={match.gameData?.data?.battle_stats?.m_CampBKillShenGui || 0} onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const updated = { ...match, gameData: { ...match.gameData, data: { ...match.gameData?.data, battle_stats: { ...match.gameData?.data?.battle_stats, m_CampBKillShenGui: val } } } };
                                                        setSelectedSeries(prev => prev.map(m => m.id === match.id ? updated : m));
                                                    }} className="w-full bg-slate-800 border-slate-600 rounded text-[10px] p-1"/></div>
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={() => updateHistoryItem(match)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded font-bold text-xs">SAVE CHANGES</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
                                        <div className={`flex-1 flex flex-col items-center ${match.winner === 'blue' ? 'opacity-100' : 'opacity-50'}`}>
                                            <span className="text-xs font-black text-blue-400">{match.blue.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-400">KDA: {match.blue.score}</span>
                                                {match.winner === 'blue' && <span className="text-[8px] bg-blue-500 text-black px-1.5 rounded font-bold">WIN</span>}
                                            </div>
                                        </div>
                                        <div className="px-4"><span className="text-xl font-black text-slate-700">VS</span></div>
                                        <div className={`flex-1 flex flex-col items-center ${match.winner === 'red' ? 'opacity-100' : 'opacity-50'}`}>
                                            <span className="text-xs font-black text-red-400">{match.red.name}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                {match.winner === 'red' && <span className="text-[8px] bg-red-500 text-black px-1.5 rounded font-bold">WIN</span>}
                                                <span className="text-[10px] text-slate-400">KDA: {match.red.score}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
  };

  const renderSettings = () => (
    <div className="flex flex-col gap-6">
       <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-emerald-400 font-black uppercase tracking-widest mb-4">Network & Data Source</h3>
          <div className="grid gap-6">
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

             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Granular Sync Controls</h4>
                <div className="flex items-center justify-between"><span className="text-[10px] text-white font-bold">Pick Sync (Heroes)</span><button onClick={() => updateSyncControl('isPickSyncEnabled')} className={`w-8 h-4 rounded-full transition-colors ${state.syncControl?.isPickSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}/></div>
                <div className="flex items-center justify-between"><span className="text-[10px] text-white font-bold">Ban Sync</span><button onClick={() => updateSyncControl('isBanSyncEnabled')} className={`w-8 h-4 rounded-full transition-colors ${state.syncControl?.isBanSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}/></div>
                <div className="flex items-center justify-between"><span className="text-[10px] text-white font-bold">Team Name & Logo Auto-Match</span><button onClick={() => updateSyncControl('isTeamNameSyncEnabled')} className={`w-8 h-4 rounded-full transition-colors ${state.syncControl?.isTeamNameSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}/></div>
             </div>
          </div>
       </div>

       <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-pink-400 font-black uppercase tracking-widest mb-4">Theme & Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blue Team Colors */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-900/10">
                  <h4 className="text-blue-400 font-bold text-xs uppercase mb-3">Blue Team Indicators</h4>
                  <div className="space-y-3">
                      <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-1">Active Score Color</label>
                          <div className="flex gap-2">
                              <input type="color" value={draft.theme?.scoreActiveColorBlue || '#22d3ee'} onChange={e => updateTheme('scoreActiveColorBlue', e.target.value)} className="h-8 w-8 rounded cursor-pointer bg-transparent"/>
                              <input type="text" value={draft.theme?.scoreActiveColorBlue || '#22d3ee'} onChange={e => updateTheme('scoreActiveColorBlue', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 text-xs w-24"/>
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-1">Inactive Score Color</label>
                          <div className="flex gap-2">
                              <input type="color" value={draft.theme?.scoreInactiveColorBlue || '#1e293b'} onChange={e => updateTheme('scoreInactiveColorBlue', e.target.value)} className="h-8 w-8 rounded cursor-pointer bg-transparent"/>
                              <input type="text" value={draft.theme?.scoreInactiveColorBlue || '#1e293b'} onChange={e => updateTheme('scoreInactiveColorBlue', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 text-xs w-24"/>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Red Team Colors */}
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-900/10">
                  <h4 className="text-red-400 font-bold text-xs uppercase mb-3">Red Team Indicators</h4>
                  <div className="space-y-3">
                      <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-1">Active Score Color</label>
                          <div className="flex gap-2">
                              <input type="color" value={draft.theme?.scoreActiveColorRed || '#ef4444'} onChange={e => updateTheme('scoreActiveColorRed', e.target.value)} className="h-8 w-8 rounded cursor-pointer bg-transparent"/>
                              <input type="text" value={draft.theme?.scoreActiveColorRed || '#ef4444'} onChange={e => updateTheme('scoreActiveColorRed', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 text-xs w-24"/>
                          </div>
                      </div>
                      <div>
                          <label className="text-[10px] text-slate-400 uppercase block mb-1">Inactive Score Color</label>
                          <div className="flex gap-2">
                              <input type="color" value={draft.theme?.scoreInactiveColorRed || '#1e293b'} onChange={e => updateTheme('scoreInactiveColorRed', e.target.value)} className="h-8 w-8 rounded cursor-pointer bg-transparent"/>
                              <input type="text" value={draft.theme?.scoreInactiveColorRed || '#1e293b'} onChange={e => updateTheme('scoreInactiveColorRed', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 text-xs w-24"/>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
       </div>
    </div>
  );

  const renderPrepare = () => (
      <div className={`bg-slate-800/30 rounded-2xl border p-6 transition-all duration-300 ${isRegistryDirty() ? 'border-purple-500/50 shadow-lg shadow-purple-500/5' : 'border-slate-700/50'}`}>
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-purple-400 font-black uppercase tracking-widest">Team Registry & Data</h3>
            <div className="flex gap-2">
               <button onClick={handleFactoryReset} className="text-[10px] font-black bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-full transition-all shadow-lg flex items-center gap-2"><span>⚠️ FACTORY RESET</span></button>
               <button onClick={() => downloadJson(state.teamLibrary, 'team-library.json')} className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full transition-all shadow-lg flex items-center gap-2"><span>⬇️ EXPORT JSON</span></button>
               <a href="/template.zip" download className="text-[10px] font-black bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-full transition-all shadow-lg flex items-center gap-2"><span>⬇️ TEMPLATE</span></a>
               <label className="text-[10px] font-black bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full transition-all shadow-lg cursor-pointer flex items-center gap-2"><span>📂 IMPORT ZIP</span><input type="file" accept=".zip" className="hidden" onChange={handleImportTeams} /></label>
               {isRegistryDirty() && <button onClick={applyRegistryChanges} className="text-[10px] font-black bg-purple-500 text-white px-4 py-1.5 rounded-full hover:bg-purple-400 transition-all shadow-lg">APPLY CHANGES</button>}
            </div>
         </div>
       <div className="flex flex-col gap-6">
                  {(state.teamLibrary && state.teamLibrary.length > 0) && (<div className="bg-slate-900/50 p-4 rounded-xl border border-blue-500/30 space-y-2"><h4 className="text-xs font-bold text-blue-400 uppercase">Imported Team Library ({state.teamLibrary.length})</h4><div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">{state.teamLibrary.map(t => (<div key={t.id} className="bg-slate-800 px-2 py-1 rounded border border-slate-700 text-[10px] text-white flex items-center gap-2">{t.logoUrl && <img src={t.logoUrl.startsWith('assets/') ? '/' + t.logoUrl : t.logoUrl} className="w-4 h-4 object-contain" />}<span>{t.name}</span></div>))}</div></div>)}
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-4">
                     <h4 className="text-xs font-bold text-slate-400 uppercase">{editingTeamId ? 'Edit Team' : 'Add New Team'}</h4>
                     <div className="flex flex-wrap gap-4 items-end">
                         <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Team Name</label><input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs font-semibold w-40" placeholder="Ex: EVOS LEGENDS" /></div>
                         <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Leader ID / Trigger</label><input value={newTeamLeader} onChange={(e) => setNewTeamLeader(e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs font-semibold w-40" placeholder="Ex: EVOS.REKT" /></div>
                         <div className="flex flex-col gap-1"><label className="text-[9px] font-bold text-slate-500 uppercase">Logo</label><div className="relative group">{newTeamLogo ? <img src={newTeamLogo} className="w-9 h-9 object-contain bg-black/20 rounded border border-slate-600" /> : <div className="w-9 h-9 bg-slate-800 border border-slate-600 rounded flex items-center justify-center text-[8px]">UP</div>}<input type="file" accept="image/*" onChange={(e) => handleImageUpload('prepare', e)} className="absolute inset-0 opacity-0 cursor-pointer" /></div></div>
                         <div className="flex gap-2">
                             <button onClick={handleSaveRegistryTeam} className={`px-4 py-2 ${editingTeamId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-purple-600 hover:bg-purple-500'} text-white rounded text-[10px] font-black uppercase tracking-wide`}>
                                 {editingTeamId ? 'UPDATE' : 'ADD'}
                             </button>
                             {editingTeamId && (
                                 <button onClick={cancelEditingTeam} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-black uppercase tracking-wide">
                                     CANCEL
                                 </button>
                             )}
                         </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{(draft.registry || []).map((team) => (
                     <div key={team.id} className={`bg-slate-800 border rounded-lg p-3 flex items-center justify-between group transition-all ${editingTeamId === team.id ? 'border-amber-500/50 bg-amber-900/10' : 'border-slate-700'}`}>
                         <div className="flex items-center gap-3">
                             {team.logo ? <img src={team.logo.startsWith('data:') ? team.logo : (team.logo.startsWith('assets/') ? '/' + team.logo : `/assets/${team.logo}.png`)} className="w-10 h-10 object-contain bg-black/20 rounded" /> : <div className="w-10 h-10 bg-slate-900 rounded flex items-center justify-center text-[8px]">N/A</div>}
                             <div className="flex flex-col"><span className="text-xs font-black text-white">{team.name}</span><span className="text-[9px] text-purple-400 font-bold uppercase">{team.leaderId}</span></div>
                         </div>
                         <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => startEditingTeam(team)} className="text-slate-400 hover:text-amber-400 transition-colors p-1.5 bg-slate-900/50 rounded hover:bg-slate-900" title="Edit Team">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                             </button>
                             <button onClick={() => removeTeamFromRegistry(team.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1.5 bg-slate-900/50 rounded hover:bg-slate-900" title="Delete Team">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                             </button>
                         </div>
                     </div>
                  ))}</div>
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
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Format</span>
            <select value={state.game.bestOf} onChange={(e) => updateLiveGame('bestOf', parseInt(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 ring-blue-500 transition-all"><option value="1">Best of 1</option><option value="3">Best of 3</option><option value="5">Best of 5</option></select>
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
          {/* Game State Indicator & Simulation */}
          <div className="flex flex-col items-end mr-2 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/50">
             <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-0.5">Game State Sim</span>
             <select 
                value={state.gameData?.debug?.game_state ?? 0} 
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setState(prev => {
                        const newData = { ...(prev.gameData || { type: 'init', debug: { manager_found: true, game_state: 0, feature_enabled: true }, data: {} }) };
                        if (!newData.debug) newData.debug = { manager_found: true, game_state: 0, feature_enabled: true };
                        newData.debug.game_state = val;
                        return { ...prev, gameData: newData as any };
                    });
                }}
                className="bg-slate-800 text-[9px] font-black tracking-wider text-white border-none rounded px-1 py-0.5 focus:ring-0 cursor-pointer text-right w-24"
             >
                <option value="0">0 - None</option>
                <option value="1">1 - Lobby</option>
                <option value="2">2 - Matching</option>
                <option value="3">3 - Pick/Ban</option>
                <option value="4">4 - Loading</option>
                <option value="5">5 - Battle (Hide Draft)</option>
                <option value="6">6 - Victory (15s Delay)</option>
                <option value="7">7 - Clearing</option>
                <option value="22">22 - Enter Battle</option>
             </select>
             <span className="text-[8px] opacity-60 font-bold text-slate-400">
                  {state.gameData?.debug?.game_state !== undefined ? (GAME_STATE_LABELS[state.gameData.debug.game_state] || 'UNKNOWN') : ''}
             </span>
          </div>

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
        <button onClick={() => setActiveTab('battle')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'battle' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Battle Stats</button>
        <button onClick={() => setActiveTab('settings')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'settings' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Settings & Theme</button>
        <button onClick={() => setActiveTab('ads')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'ads' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Ads & Sponsors</button>
        <button onClick={() => setActiveTab('prepare')} className={`px-6 py-2 text-xs font-bold uppercase tracking-widest border-b-2 ${activeTab === 'prepare' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Prepare Data</button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTab === 'teams' ? renderTeams() :
         activeTab === 'history' ? renderHistory() :
         activeTab === 'battle' ? renderBattle() :
         activeTab === 'settings' ? renderSettings() :
         activeTab === 'ads' ? renderAds() :
         activeTab === 'prepare' ? renderPrepare() : null}
      </div>
    </div>
  );
};

export default AdminPanel;
