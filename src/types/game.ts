export type GameMode = 'fighting' | 'racing' | 'forge' | 'leaderboards' | 'guide';

export type FightMode = 'pve' | 'pvp' | 'spectator'; // spectator = AI vs AI auto battle!
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'champion';

export type Archetype = 'Brawler' | 'Speedster' | 'Grappler' | 'Tactician' | 'Blossom Striker';

export interface CharacterStats {
  health: number; // 90 - 130
  attack: number; // 8 - 18
  speed: number;  // 6 - 15
  defense: number;// 5 - 15 (block damage reduction)
  superPower: number; // 20 - 45
}

export interface CharacterColors {
  primary: string;
  secondary: string;
  hair: string;
  skin: string;
  outfit: string;
  aura: string;
}

export interface SpecialMove {
  name: string;
  description: string;
  quote: string;
  damage: number;
  icon: string;
}

export interface KartConfig {
  modelName: string;
  color: string;
  topSpeed: number; // 5 - 10
  acceleration: number; // 0.1 - 0.3
  handling: number; // 0.04 - 0.09
}

export interface Character {
  id: string;
  name: string;
  title: string;
  gender: 'boy' | 'girl' | 'other';
  archetype: Archetype;
  avatarUrl?: string; // e.g. path or base64
  stats: CharacterStats;
  colors: CharacterColors;
  specialMove: SpecialMove;
  kart: KartConfig;
  lore: string;
  wins: number;
  losses: number;
  aiBehavior: 'aggressive' | 'defensive' | 'balanced' | 'erratic';
  isCustom?: boolean;
  createdAt?: string;
}

export interface FightingLeaderboardEntry {
  id: string;
  rank: number;
  playerName: string;
  characterName: string;
  characterAvatar?: string;
  rating: number; // ELO rating e.g. 1200 - 2800
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Grandmaster';
  date: string;
}

export interface RacingLeaderboardEntry {
  id: string;
  rank: number;
  playerName: string;
  characterName: string;
  kartName: string;
  trackName: string;
  bestLapTime: number; // in seconds e.g. 28.45s
  date: string;
}
