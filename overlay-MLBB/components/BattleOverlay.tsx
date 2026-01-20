import React, { useMemo } from 'react';
import { AppState, BattleStats } from '../types';
import KillNotification from './KillNotification';

interface BattleOverlayProps {
  data: AppState;
}

const BattleOverlay: React.FC<BattleOverlayProps> = ({ data }) => {
  const stats = data.gameData?.data?.battle_stats || {
    time: 0,
    m_iCampAKill: 0,
    m_iCampBKill: 0,
    m_CampAGold: 0,
    m_CampBGold: 0,
    m_CampAExp: 0,
    m_CampBExp: 0,
    m_CampAKillTower: 0,
    m_CampBKillTower: 0,
    m_CampAKillLingZhu: 0,
    m_CampBKillLingZhu: 0,
    m_CampAKillShenGui: 0,
    m_CampBKillShenGui: 0
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatGold = (gold: number) => {
    return (gold / 1000).toFixed(2) + ' k';
  };

  // Helper for assets to avoid broken images
  const getAsset = (path: string) => {
    return path;
  };

  const PLACEHOLDER_TRANSPARENT = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  const theme = data.theme || {
    scoreActiveColorBlue: '#22d3ee',
    scoreInactiveColorBlue: '#1e293b',
    scoreActiveColorRed: '#ef4444',
    scoreInactiveColorRed: '#1e293b'
  };

  const goldDiff = Math.abs(stats.m_CampAGold - stats.m_CampBGold);
  const isBlueLeading = stats.m_CampAGold > stats.m_CampBGold;
  const isRedLeading = stats.m_CampBGold > stats.m_CampAGold;

  return (
    <>
    {/* <KillNotification data={data} /> */}
    <link href="https://fonts.googleapis.com/css2?family=League+Gothic&display=swap" rel="stylesheet" />
    <style>
    {`
      .font-league { font-family: 'League Gothic', sans-serif; }
      .stat-text {
        text-align: center;
        justify-content: center;
        display: flex;
        flex-direction: column;
        color: white;
        font-size: 24px;
        font-weight: 400;
        word-wrap: break-word;
        text-shadow: 1px 1px 2px black;
      }
      .big-stat {
        text-align: center;
        justify-content: center;
        display: flex;
        flex-direction: column;
        color: white;
        font-size: 48px;
        font-weight: 400;
        word-wrap: break-word;
        text-shadow: 2px 2px 4px black;
      }
      .team-name-battle {
        text-align: center;
        justify-content: center;
        display: flex;
        flex-direction: column;
        color: black;
        font-size: 24px;
        font-weight: 400;
        word-wrap: break-word;
        width: 537px;
        z-index: 5;
      }
      .rect-score {
        width: 10px;
        height: 28px;
        transition: all 0.3s ease;
      }
      .blue-skew { transform: skewX(-20deg); }
      .red-skew { transform: skewX(20deg); }
      .gold-diff-container {
        position: absolute;
        top: 110px;
        display: flex;
        align-items: center;
        gap: 5px;
        background-color: rgba(0,0,0,0.6);
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.2);
      }
      .gold-diff-text {
        color: #FFD700;
        font-size: 20px;
        font-weight: bold;
        text-shadow: 1px 1px 2px black;
      }

      /* --- ANIMATIONS --- */
      @keyframes slideInLeft {
        0% { opacity: 0; transform: translateX(-100px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInRight {
        0% { opacity: 0; transform: translateX(100px); }
        100% { opacity: 1; transform: translateX(0); }
      }
      @keyframes slideInTop {
        0% { opacity: 0; transform: translateY(-50px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleBounce {
        0% { opacity: 0; transform: scale(0.5); }
        60% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes fadeInUp {
        0% { opacity: 0; transform: translateY(20px); }
        100% { opacity: 1; transform: translateY(0); }
      }

      .anim-left { animation: slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      .anim-right { animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      .anim-top { animation: slideInTop 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      .anim-center { animation: scaleBounce 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      .anim-fade-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}
      </style>

      <div className="absolute w-[1920px] h-[1080px] top-0 left-0 overflow-hidden font-league pointer-events-none">

      {/* Minimap Frame */}
      <div style={{ width: '339px', height: '339px', left: '0px', top: '0px', outline: '3px #18252C solid', outlineOffset: '-1.50px', position: 'absolute' }}></div>

      {/* Background Logos */}
      <img src={getAsset("assets/battle/background logo.png")} className="absolute anim-left" style={{ width: '261px', height: '140px', left: '339px', top: '0px', objectFit: 'cover', animationDelay: '0.1s' }} onError={e => e.currentTarget.style.display='none'} />

      {/* PERBAIKAN: Ganti Ini Menjadi miror horizontal */}
      {/* Dibungkus DIV agar animasi 'anim-right' tetap jalan, tapi gambar di dalamnya di-mirror */}
      <div className="absolute anim-right" style={{ width: '261px', height: '140px', left: '1659px', top: '0px', animationDelay: '0.1s' }}>
      <img
      src={getAsset("assets/battle/background logo.png")}
      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      onError={e => e.currentTarget.style.display='none'}
      />
      </div>

      {/* Center */}
      <img src={getAsset("assets/battle/center.png")} className="absolute anim-top" style={{ width: '395px', height: '150px', left: '932px', top: '0px', animationDelay: '0.2s' }} onError={e => e.currentTarget.style.display='none'} />

      {/* Logo Acara */}
      <img src={getAsset("assets/battle/logo.png")} className="absolute anim-center" style={{ width: '45px', height: '63px', left: '1111px', top: '59px', animationDelay: '0.5s' }} onError={e => e.currentTarget.style.display='none'} />

      {/* Team Name Backgrounds */}
      <img src={getAsset("assets/battle/nsms tesm bg.png")} className="absolute anim-left" style={{ width: '537.50px', height: '46px', left: '435.50px', top: '59px', animationDelay: '0.3s' }} onError={e => e.currentTarget.style.display='none'} />

      {/* PERBAIKAN: Ganti Ini Menjadi miror horizontal */}
      <div className="absolute anim-right" style={{ width: '536px', height: '46px', left: '1289px', top: '59px', animationDelay: '0.3s' }}>
      <img
      src={getAsset("assets/battle/nsms tesm bg.png")}
      style={{ width: '100%', height: '100%', transform: 'scaleX(-1)' }}
      onError={e => e.currentTarget.style.display='none'}
      />
      </div>

      {/* Battle State Parts */}
      <img src={getAsset("assets/battle/battlestate part left.png")} className="absolute anim-left" style={{ width: '532px', height: '81px', left: '492.50px', top: '0px', animationDelay: '0.2s' }} onError={e => e.currentTarget.style.display='none'} />
      <img src={getAsset("assets/battle/battlestate part right.png")} className="absolute anim-right" style={{ width: '524px', height: '81px', left: '1240.5px', top: '0px', animationDelay: '0.2s' }} onError={e => e.currentTarget.style.display='none'} />

      {/* Semi Center Parts */}
      <img src={getAsset("assets/battle/semi center left.svg")} className="absolute anim-left" style={{ width: '255px', height: '126px', left: '848px', top: '0px', animationDelay: '0.25s' }} onError={e => e.currentTarget.style.display='none'} />
      <img src={getAsset("assets/battle/semi center right.svg")} className="absolute anim-right" style={{ width: '255px', height: '126px', left: '1161px', top: '0px', animationDelay: '0.25s' }} onError={e => e.currentTarget.style.display='none'} />

      {/* Timer */}
      <img src={getAsset("assets/battle/timer bg.svg")} className="absolute anim-top" style={{ width: '113px', height: '45px', left: '1076px', top: '0px', animationDelay: '0.4s' }} onError={e => e.currentTarget.style.display='none'} />
      <div className="absolute anim-center" style={{ width: '113px', top: '-3px', left: '1076px', textAlign: 'center', color: 'black', fontSize: '24px', fontWeight: 'bold', animationDelay: '0.6s' }}>
      {formatTime(stats.time)}
      </div>

      {/* Team Names */}
      <div className="team-name-battle absolute anim-fade-up" style={{ left: '435px', top: '77px', animationDelay: '0.5s' }}>{data.blue.name}</div>
      <div className="team-name-battle absolute anim-fade-up" style={{ left: '1289px', top: '77px', animationDelay: '0.5s' }}>{data.red.name}</div>

      {/* Gold Difference Indicator */}
      {goldDiff > 0 && (
        <>
        {isBlueLeading && (
          <div className="gold-diff-container anim-fade-up" style={{ left: '853px', animationDelay: '0.8s' }}>
          <img src={getAsset("assets/battle/gold.png")} style={{ width: '20px', height: '20px' }} />
          <span className="gold-diff-text">+</span>
          <span className="gold-diff-text">{formatGold(goldDiff)}</span>
          </div>
        )}
        {isRedLeading && (
          <div className="gold-diff-container anim-fade-up" style={{ left: '1398px', animationDelay: '0.8s' }}>
          <img src={getAsset("assets/battle/gold.png")} style={{ width: '20px', height: '20px' }} />
          <span className="gold-diff-text">+</span>
          <span className="gold-diff-text">{formatGold(goldDiff)}</span>
          </div>
        )}
        </>
      )}

      {/* ICONS AND STATS LEFT */}

      {/* Turtle */}
      <img src={getAsset("assets/battle/icon turtle.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '686px', top: '10px', objectFit: 'contain', animationDelay: '0.6s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '694px', top: '45px', animationDelay: '0.7s' }}>{stats.m_CampAKillShenGui}</div>

      {/* Lord */}
      <img src={getAsset("assets/battle/icon lord.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '765px', top: '12px', objectFit: 'contain', animationDelay: '0.65s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '773px', top: '45px', animationDelay: '0.75s' }}>{stats.m_CampAKillLingZhu}</div>

      {/* Turret */}
      <img src={getAsset("assets/battle/icon turet.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '853px', top: '12px', objectFit: 'contain', animationDelay: '0.7s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '859px', top: '45px', animationDelay: '0.8s' }}>{stats.m_CampAKillTower}</div>

      {/* Gold */}
      <img src={getAsset("assets/battle/gold.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '952px', top: '11px', animationDelay: '0.75s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '946px', top: '45px', animationDelay: '0.85s' }}>{formatGold(stats.m_CampAGold)}</div>

      {/* Indicators Left (Score) */}
      <div className="absolute flex gap-[6px] items-center anim-center" style={{ left: '1016px', top: '85px', animationDelay: '0.9s' }}>
      {Array.from({ length: Math.ceil(data.game.bestOf / 2) }).map((_, i) => (
        <div key={i} className="rect-score blue-skew" style={{ backgroundColor: i < data.blue.score ? theme.scoreActiveColorBlue : theme.scoreInactiveColorBlue }}></div>
      ))}
      </div>

      <div className="big-stat absolute anim-center" style={{ left: '1033px', top: '10px', animationDelay: '1.0s' }}>{stats.m_iCampAKill || data.blue.kills || 0}</div>


      {/* ICONS AND STATS RIGHT */}

      {/* Gold */}
      <img src={getAsset("assets/battle/gold.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '1283px', top: '11px', animationDelay: '0.75s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '1277px', top: '45px', animationDelay: '0.85s' }}>{formatGold(stats.m_CampBGold)}</div>

      {/* Turret */}
      <img src={getAsset("assets/battle/icon turet.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '1398px', top: '12px', objectFit: 'contain', animationDelay: '0.7s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '1405px', top: '45px', animationDelay: '0.8s' }}>{stats.m_CampBKillTower}</div>

      {/* Lord */}
      <img src={getAsset("assets/battle/icon lord.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '1477px', top: '12px', objectFit: 'contain', animationDelay: '0.65s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '1484px', top: '45px', animationDelay: '0.75s' }}>{stats.m_CampBKillLingZhu}</div>

      {/* Turtle */}
      <img src={getAsset("assets/battle/icon turtle.png")} className="absolute anim-fade-up" style={{ width: '25px', height: '25px', left: '1560px', top: '10px', objectFit: 'contain', animationDelay: '0.6s' }} onError={e => e.currentTarget.src = PLACEHOLDER_TRANSPARENT} />
      <div className="stat-text absolute anim-fade-up" style={{ left: '1568px', top: '45px', animationDelay: '0.7s' }}>{stats.m_CampBKillShenGui}</div>

      {/* Indicators Right */}
      <div className="absolute flex gap-[6px] items-center anim-center" style={{ left: '1205px', top: '85px', flexDirection: 'row-reverse', animationDelay: '0.9s' }}>
      {Array.from({ length: Math.ceil(data.game.bestOf / 2) }).map((_, i) => (
        <div key={i} className="rect-score red-skew" style={{ backgroundColor: i < data.red.score ? theme.scoreActiveColorRed : theme.scoreInactiveColorRed }}></div>
      ))}
      </div>

      {/* Score Right (Kills) */}
      <div className="big-stat absolute anim-center" style={{ left: '1213px', top: '10px', animationDelay: '1.0s' }}>{stats.m_iCampBKill || data.red.kills || 0}</div>

      {/* Team Logos */}
      {data.blue.logo && <img src={data.blue.logo.startsWith('assets') ? `/${data.blue.logo}` : data.blue.logo} className="absolute anim-center" style={{ width: '57px', height: '57px', left: '407px', top: '10px', objectFit: 'contain', animationDelay: '1.1s' }} />}
      {data.red.logo && <img src={data.red.logo.startsWith('assets') ? `/${data.red.logo}` : data.red.logo} className="absolute anim-center" style={{ width: '57px', height: '57px', left: '1796px', top: '10px', objectFit: 'contain', animationDelay: '1.1s' }} />}

      </div>
      </>
  );
};

export default BattleOverlay;
