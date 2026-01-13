export interface TeamData {
  name: string;
  logo?: string;
  picks: string[];
  pNames: string[];
  pIds: string[];
  bans: string[];
  score: number;
}

export interface GameState {
  matchTitle: string;
  phase: string;
  timer: number;
  turn: 'blue' | 'red';
  isIntroActive: boolean;
  isGameControlEnabled: boolean;
  bestOf: number;
  visibility: {
    phase: boolean;
    timer: boolean;
    turn: boolean;
    score: boolean;
    isAutoSync: boolean; // Add isAutoSync here
  };
}

export interface AppAssets {
  union1: string;
  union2: string;
  logo: string;
  gradient: string;
}

export interface AdConfig {
  type: 'images' | 'text';
  effect: 'scroll' | 'fade';
  text: string;
  speed: number;
}

export interface RegisteredTeam {
  id: string;
  name: string;
  logo: string;
  leaderId: string;
}

export interface TeamLibraryEntry {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  captainId?: string;
}

export interface AppState {
  blue: TeamData;
  red: TeamData;
  game: GameState;
  ads: string[];
  adConfig: AdConfig;
  assets: AppAssets;
  registry: RegisteredTeam[];
  teamLibrary: TeamLibraryEntry[];
  history: any[];
  status?: string;
  gameData?: GameData;
}

export interface BracketMatch {
  id: string;
  round: string;
  matchTitle: string;
  team1Id?: string;
  team2Id?: string;
  score1?: number;
  score2?: number;
  winnerId?: string;
  nextMatchId?: string;
}

// Interfaces matching C++ JSON output
export interface RoomPlayer {
    lUid: number;
    _sName: string;
    iCamp: number;
    heroid: number;
    uiRankLevel: number;
    summonSkillId: number;
    banHero: number;
    iRoad: number;
    uiZoneId: number;
    heroskin: number;
}

export interface RoomInfo {
    player_count: number;
    players: RoomPlayer[];
}

export interface LogicPlayer {
    m_ID: number;
    totalGold: number;
    _TripleKillTimes: number;
    _QuadraKillTimes: number;
    _PentaKillTimes: number;
    m_TotalExp: number;
}

export interface BattleStats {
    time: number;
    m_iCampAKill: number;
    m_iCampBKill: number;
    m_CampAGold: number;
    m_CampBGold: number;
    m_CampAExp: number;
    m_CampBExp: number;
    m_CampAKillTower: number;
    m_CampBKillTower: number;
    m_CampAKillLingZhu: number;
    m_CampBKillLingZhu: number;
    m_CampAKillShenGui: number;
    m_CampBKillShenGui: number;
}

export interface GameData {
    type: string;
    debug?: {
        manager_found: boolean;
        game_state: number;
        feature_enabled: boolean;
    };
    data?: {
        room_info?: RoomInfo;
        logic_players?: LogicPlayer[];
        battle_stats?: BattleStats;
        battle_players?: any[]; // Populated if needed
    };
}

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
