export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type GameStatus = 'waiting' | 'in_progress' | 'finished';

export type TurnPhase = 'roll' | 'move';

export interface GamePlayer {
  id: string;
  userId?: string;
  name: string;
  color: PlayerColor;
  // 4 tokens; step = 0 (yard), 1..51 (track), 52..56 (home lane), 57 (finished)
  tokens: [number, number, number, number];
  connected: boolean;
  forcedNextDice: number | null; // 1-6 or null
  socketId: string | null;
  isHost: boolean;
  rank: number | null; // 1, 2, 3, 4
}

export interface GameActionLog {
  id: string;
  text: string;
  color?: PlayerColor;
  timestamp: number;
}

export interface GameRanking {
  playerId: string;
  name: string;
  color: PlayerColor;
  rank: number;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  maxPlayers: 2 | 3 | 4;
  players: GamePlayer[];
  currentTurnPlayerId: string | null;
  currentTurnColor: PlayerColor | null;
  turnPhase: TurnPhase;
  lastDiceResult: number | null;
  consecutiveSixes: number;
  validTokenIndices: number[];
  winner: GamePlayer | null;
  rankings: GameRanking[];
  recentActions: GameActionLog[];
  createdAt: number;
  updatedAt: number;
}

export interface GameSummary {
  gameId: string;
  status: GameStatus;
  maxPlayers: number;
  playersCount: number;
  players: {
    id: string;
    name: string;
    color: PlayerColor;
    connected: boolean;
    forcedNextDice: number | null;
  }[];
  currentTurnPlayerId: string | null;
  currentTurnPlayerName?: string;
  lastDiceResult: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdminAuditLogEntry {
  id: string;
  gameId: string;
  adminUsername: string;
  targetPlayerId: string;
  targetPlayerName: string;
  forcedValue: number | null;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  gameId: string;
  senderId: string;
  senderName: string;
  senderColor: PlayerColor;
  text: string;
  timestamp: number;
}
