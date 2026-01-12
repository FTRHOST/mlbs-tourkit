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
