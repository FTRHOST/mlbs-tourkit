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

// BracketMatch is removed as requested, but kept if needed for legacy or future
// For now, removing to be clean.

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