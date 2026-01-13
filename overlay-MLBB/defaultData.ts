import { AppState, GameData } from './types';

// Also exporting a default GameData structure as requested by the user prompt,
// although the application primarily uses DEFAULT_APP_STATE for the Overlay.
export const DEFAULT_GAME_DATA: GameData = {
    type: 'init',
    debug: {
        manager_found: false,
        game_state: 0,
        feature_enabled: false
    },
    data: {
        room_info: {
            player_count: 0,
            players: []
        },
        battle_stats: {
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
        }
    }
};

export const DEFAULT_APP_STATE: AppState = {
  blue: {
    name: 'BLUE TEAM',
    picks: ['0', '0', '0', '0', '0'],
    pNames: ['', '', '', '', ''],
    pIds: ['', '', '', '', ''],
    bans: ['0', '0', '0', '0', '0'],
    score: 0
  },
  red: {
    name: 'RED TEAM',
    picks: ['0', '0', '0', '0', '0'],
    pNames: ['', '', '', '', ''],
    pIds: ['', '', '', '', ''],
    bans: ['0', '0', '0', '0', '0'],
    score: 0
  },
  game: {
    matchTitle: 'MATCH TITLE',
    phase: 'PREPARING',
    timer: 0,
    turn: 'blue',
    isIntroActive: false,
    isGameControlEnabled: false,
    bestOf: 3,
    visibility: {
      phase: true,
      timer: true,
      turn: true,
      score: true,
      isAutoSync: true
    }
  },
  ads: [],
  adConfig: {
    type: 'text',
    effect: 'scroll',
    text: 'WAITING FOR DATA...',
    speed: 10
  },
  assets: {
    union1: '',
    union2: '',
    logo: '',
    gradient: ''
  },
  registry: [],
  teamLibrary: [],
  history: [],
  gameData: DEFAULT_GAME_DATA
};
