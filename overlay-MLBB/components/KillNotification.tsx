import React, { useEffect, useState, useRef } from 'react';
import { AppState, LogicPlayer } from '../types';

interface KillNotificationProps {
  data: AppState;
}

interface Notification {
  playerName: string;
  killType: string;
  heroId: number;
  id: number;
}

const KillNotification: React.FC<KillNotificationProps> = ({ data }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const prevPlayersRef = useRef<LogicPlayer[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const gameState = data.gameData?.debug?.game_state;
  const logicPlayers = data.gameData?.data?.logic_players || [];
  const roomPlayers = data.gameData?.data?.room_info?.players || [];

  useEffect(() => {
    // Only active in game state 6
    if (gameState !== 6) {
        prevPlayersRef.current = [];
        return;
    }

    // Initialize ref if empty
    if (prevPlayersRef.current.length === 0 && logicPlayers.length > 0) {
       prevPlayersRef.current = JSON.parse(JSON.stringify(logicPlayers));
       return;
    }

    let newNotif: Notification | null = null;

    logicPlayers.forEach((player) => {
      const prevPlayer = prevPlayersRef.current.find(p => p.m_ID === player.m_ID);
      if (!prevPlayer) return;

      let type = '';
      if (player._PentaKillTimes > prevPlayer._PentaKillTimes) type = 'SAVAGE';
      else if (player._QuadraKillTimes > prevPlayer._QuadraKillTimes) type = 'MANIAC';
      else if (player._TripleKillTimes > prevPlayer._TripleKillTimes) type = 'TRIPLE KILL';
      else if (player._DoubleKillTimes > prevPlayer._DoubleKillTimes) type = 'DOUBLE KILL';

      if (type) {
        const roomPlayer = roomPlayers.find(rp => rp.heroid === player.m_ID);
        const name = roomPlayer ? roomPlayer._sName : `Hero ${player.m_ID}`;
        
        newNotif = {
          playerName: name,
          killType: type,
          heroId: player.m_ID,
          id: Date.now()
        };
      }
    });

    if (newNotif) {
        showNotification(newNotif);
    }

    prevPlayersRef.current = JSON.parse(JSON.stringify(logicPlayers));
  }, [logicPlayers, gameState, roomPlayers]);

  const showNotification = (notif: Notification) => {
    setNotification(notif);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  if (!notification) return null;

  // Mapping based on user's width: 
  // 532px -> bg-020.svg (bg-02)
  // 524px -> bg-010.svg (bg-01)
  const bg02 = "/assets/killnotification/bg-020.svg"; 
  const bg01 = "/assets/killnotification/bg-010.svg";
  const heroImg = `/assets/hero/${notification.heroId}.png`;

  return (
    <div style={{
        width: '1920px',
        height: '1080px',
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1000,
        animation: 'fadeInOut 3s ease-in-out forwards'
    }}>
        <style>
        {`
            @font-face {
                font-family: "Lilita One";
                src: local("Lilita One"), local("LilitaOne"), url(https://fonts.gstatic.com/s/lilitaone/v13/i7dPIFZ9Zz-WBtRtet7KRCNd.woff2) format('woff2');
            }
            @keyframes fadeInOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { opacity: 0; }
            }
        `}
        </style>

        {/* Img 1: 532px width (BG 02) */}
        <img 
            src={bg02} 
            style={{
                width: '532px',
                height: '81px',
                left: '710px',
                top: '900px',
                position: 'absolute',
                objectFit: 'cover'
                // Removed background color placeholder
            }} 
        />

        {/* Img 2: 524px width (BG 01) - Rotated */}
        <img 
            src={bg01} 
            style={{
                width: '524px',
                height: '81px',
                left: '1320px',
                top: '955px',
                position: 'absolute',
                transform: 'rotate(180deg)',
                transformOrigin: 'top left',
                objectFit: 'cover'
                // Removed background color placeholder
            }} 
        />

        {/* Player Name */}
        <div style={{
            width: '127px',
            height: '26px',
            left: '960px',
            top: '955px',
            position: 'absolute',
            textAlign: 'center',
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            fontSize: '24px',
            fontFamily: '"Lilita One", sans-serif',
            fontWeight: 400,
            wordWrap: 'break-word'
        }}>
            {notification.playerName}
        </div>

        {/* Kill Type (DOUBLEKILL etc) */}
        <div style={{
            width: '330px',
            height: '81px',
            left: '882px',
            top: '874px',
            position: 'absolute',
            textAlign: 'center',
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            fontSize: '48px',
            fontFamily: '"Lilita One", sans-serif',
            fontWeight: 400,
            wordWrap: 'break-word',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)' // Added shadow for readability
        }}>
            {notification.killType}
        </div>

        {/* Hero Portrait */}
        <img 
            src={heroImg} 
            style={{
                width: '157px',
                height: '203px',
                left: '736px',
                top: '778px',
                position: 'absolute',
                objectFit: 'cover'
            }} 
            onError={(e) => e.currentTarget.style.display = 'none'}
        />
    </div>
  );
};

export default KillNotification;
