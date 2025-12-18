export enum Role {
  WEREWOLF = 'WEREWOLF',
  VILLAGER = 'VILLAGER',
  SEER = 'SEER',
}

export enum GamePhase {
  SETUP = 'SETUP',
  DAY_INTRO = 'DAY_INTRO',
  DAY_DISCUSSION = 'DAY_DISCUSSION',
  DAY_VOTING = 'DAY_VOTING',
  NIGHT_ACTION = 'NIGHT_ACTION',
  NIGHT_RESULT = 'NIGHT_RESULT',
  GAME_OVER = 'GAME_OVER',
}

export interface Player {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
  isUser: boolean;
  avatarUrl?: string;
  bio: string;
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'GM' or player ID
  senderName: string;
  content: string;
  timestamp: number;
  type: 'NARRATION' | 'DIALOGUE' | 'SYSTEM' | 'THOUGHT';
}

export interface VoteResult {
  voterId: string;
  targetId: string;
  reason: string;
}

export interface GameState {
  phase: GamePhase;
  dayCount: number;
  players: Player[];
  messages: ChatMessage[];
  currentImage: string | null;
  winner: 'VILLAGERS' | 'WEREWOLVES' | null;
  isLoading: boolean;
  loadingMessage: string;
}