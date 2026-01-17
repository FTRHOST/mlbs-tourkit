import React, { useMemo } from 'react';
import { AppState, RoomPlayer } from '../types';
import './OverviewDraft.css';
import AdContent from './AdContent';

interface OverviewDraftProps {
  data: AppState;
}

const ASSETS_PATH = "/assets/";
const PLACEHOLDERS = {
  blue: "/assets/PheroB.png",
  red: "/assets/PheroR.png",
  ban: "/assets/Pban.png",
  logo: "/assets/logo.png"
};

const OverviewDraft: React.FC<OverviewDraftProps> = ({ data }) => {
  // --- RAW DATA MAPPING (Fallback/Direct Connection) ---
  // This ensures OverviewDraft works even if isAutoSync is disabled on the backend,
  // by mapping the raw gameData directly if the main AppState seems empty.
  const derivedData = useMemo(() => {
      const room = data.gameData?.data?.room_info;
      if (!room || !room.players || room.players.length === 0) return null;

      const processSide = (camp: number) => {
          const players = room.players.filter((p: any) => p.iCamp === camp);
          const picks = Array(5).fill('0');
          const spells = Array(5).fill('0');
          const lanes = Array(5).fill('0');
          const names = Array(5).fill('');
          const bans = Array(5).fill('0');

          players.forEach((p: any, i: number) => {
              if (i < 5) {
                  picks[i] = String(p.heroid || '0');
                  spells[i] = String(p.summonSkillId || '0');
                  lanes[i] = String(p.iRoad || '0');
                  names[i] = p._sName || `PLAYER ${i+1}`;
                  bans[i] = String(p.banHero || '0');
              }
          });
          return { picks, spells, lanes, pNames: names, bans };
      };

      return {
          blue: processSide(1),
          red: processSide(2)
      };
  }, [data.gameData]);

  // Determine which data to use. 
  // If AppState (data.blue/red) has meaningful picks (not all '0'), use it (supports manual override).
  // Otherwise, fallback to derivedData from raw JSON.
  const isBlueEmpty = data.blue.picks.every(p => p === '0' || p === '');
  const isRedEmpty = data.red.picks.every(p => p === '0' || p === '');
  
  const blueSource = (!isBlueEmpty || !derivedData) ? data.blue : derivedData.blue;
  const redSource = (!isRedEmpty || !derivedData) ? data.red : derivedData.red;

  const bluePicks = blueSource.picks;
  const redPicks = redSource.picks;
  const blueNames = blueSource.pNames;
  const redNames = redSource.pNames;
  const blueSpells = blueSource.spells || [];
  const blueLanes = blueSource.lanes || [];
  const redSpells = redSource.spells || [];
  const redLanes = redSource.lanes || [];

  const getHeroImg = (heroId: string, side: 'blue' | 'red') => {
    if (!heroId || heroId === '0' || heroId === "") return PLACEHOLDERS[side];
    return `${ASSETS_PATH}hero/${heroId}.png`;
  };

  const getLaneImg = (laneId: string | undefined) => {
    if (!laneId || laneId === '0' || laneId === "") return null;
    return `${ASSETS_PATH}lane/${laneId}.png`;
  };

  const getSpellImg = (spellId: string | undefined) => {
    if (!spellId || spellId === '0' || spellId === "") return null;
    return `${ASSETS_PATH}battlespell/${spellId}.webp`;
  };

  const getBanImg = (heroId: string) => {
      if (!heroId || heroId === '0' || heroId === "") return PLACEHOLDERS.ban;
      return `${ASSETS_PATH}hero-icon/${heroId}.png`;
  }

  const getTeamLogo = (logoPath: string | undefined) => {
      if (!logoPath) return null;
      if (logoPath.startsWith('data:')) return logoPath;
      if (logoPath.startsWith('assets/') || logoPath.startsWith('/assets/')) {
        return logoPath.startsWith('/') ? logoPath : '/' + logoPath;
      }
      return `${ASSETS_PATH}${logoPath}.png`;
  }

  // Render a single player card
  const renderPlayerCard = (
    heroId: string, 
    name: string, 
    side: 'blue' | 'red', 
    index: number
  ) => {
    const spellId = side === 'blue' ? blueSpells[index] : redSpells[index];
    const laneId = side === 'blue' ? blueLanes[index] : redLanes[index];
    
    // Colors based on side
    const heroBgColor = side === 'blue' ? '#01645a' : '#9d3434';
    const nameBgColor = side === 'blue' ? '#71c1b9' : '#c17171';
    
    // Is it a placeholder state?
    const isPlaceholder = !heroId || heroId === '0' || heroId === "";

    return (
      <div key={index} className="player-card">
        {/* Hero Image Container */}
        <div className="hero-image" style={{ backgroundColor: heroBgColor }}>
             <img 
                src={getHeroImg(heroId, side)} 
                alt={`Hero ${heroId}`} 
                className={`w-full h-full object-cover ${isPlaceholder ? 'opacity-80' : ''}`}
                onError={(e) => { e.currentTarget.src = PLACEHOLDERS[side]; }}
             />
        </div>

        {/* Name Container */}
        <div className="player-name-bg" style={{ backgroundColor: nameBgColor }}></div>
        <div className="player-name-text">
          {name || `PLAYER ${index + 1}`}
        </div>

        {/* Lane Icon */}
        {getLaneImg(laneId) && (
             <>
                <div className="lane-bg"></div>
                <img 
                  src={getLaneImg(laneId)!} 
                  className="lane-icon" 
                  alt="Lane"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
             </>
        )}

        {/* Battle Spell */}
        {getSpellImg(spellId) && (
            <img 
              src={getSpellImg(spellId)!} 
              className="spell-icon" 
              alt="Spell"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
        )}
      </div>
    );
  };

  return (
    <div className="overview-draft animate-fadeIn">
      {/* Background and Layout handled by CSS class .overview-draft */}

      {/* VS Text */}
      <div className="vs-text">vs</div>

      {/* Team Names */}
      <div className="team-name-blue">{data.blue.name}</div>
      <div className="team-name-red">{data.red.name}</div>
      
      {/* Team Logos (Hidden if no logo) */}
      {data.blue.logo && (
        <div className="team-score-blue-bg">
            <img src={getTeamLogo(data.blue.logo)!} className="w-full h-full object-contain p-1" alt="Blue Logo" />
        </div>
      )}
      
      {data.red.logo && (
        <div className="team-score-red-bg">
            <img src={getTeamLogo(data.red.logo)!} className="w-full h-full object-contain p-1" alt="Red Logo" />
        </div>
      )}

      {/* Logo Acara */}
      <img 
        src={data.assets.logo || PLACEHOLDERS.logo} 
        className="logo-acara" 
        alt="Logo" 
      />

      {/* Blue Team Cards */}
      <div className="blue-player-card">
        {bluePicks.map((pick, i) => renderPlayerCard(pick, blueNames[i], 'blue', i))}
      </div>

      {/* Red Team Cards */}
      <div className="red-player-card">
        {redPicks.map((pick, i) => renderPlayerCard(pick, redNames[i], 'red', i))}
      </div>

      {/* Blue Bans */}
      <div className="ban-blue">
        {blueSource.bans.map((ban, i) => (
            <div key={i} className="ban-item">
                <img 
                    src={getBanImg(ban)} 
                    className="ban-image" 
                    alt="Ban" 
                    onError={(e) => { e.currentTarget.src = PLACEHOLDERS.ban; }}
                />
            </div>
        ))}
      </div>

      {/* Red Bans */}
      <div className="ban-red">
         {redSource.bans.map((ban, i) => (
            <div key={i} className="ban-item">
                <img 
                    src={getBanImg(ban)} 
                    className="ban-image" 
                    alt="Ban" 
                    onError={(e) => { e.currentTarget.src = PLACEHOLDERS.ban; }}
                />
            </div>
        ))}
      </div>
      
      {/* Iklan / Ad Space */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[675px] w-[1837px] h-[373px] bg-[#18252c] opacity-70 rounded-[30px] flex items-center justify-center overflow-hidden">
          <div className="w-full h-full p-4">
             <AdContent adConfig={data.adConfig} ads={data.ads} layout="grid" />
          </div>
      </div>

    </div>
  );
};

export default OverviewDraft;
