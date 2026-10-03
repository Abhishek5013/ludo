import mongoose, { Document, Schema } from 'mongoose';
import { GamePlayer, GameStatus, PlayerColor } from '../../types/ludo.js';

export interface IGame extends Document {
  gameId: string;
  status: GameStatus;
  maxPlayers: number;
  currentTurnPlayerId: string | null;
  currentTurnColor: PlayerColor | null;
  players: GamePlayer[];
  lastDiceResult: number | null;
  winner: any;
  rankings: any[];
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSubSchema = new Schema(
  {
    id: { type: String, required: true },
    userId: { type: String },
    name: { type: String, required: true },
    color: { type: String, enum: ['red', 'green', 'yellow', 'blue'], required: true },
    tokens: { type: [Number], default: [0, 0, 0, 0] },
    connected: { type: Boolean, default: true },
    forcedNextDice: { type: Number, default: null },
    socketId: { type: String, default: null },
    isHost: { type: Boolean, default: false },
    rank: { type: Number, default: null },
  },
  { _id: false }
);

const GameSchema = new Schema<IGame>(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['waiting', 'in_progress', 'finished'],
      default: 'waiting',
    },
    maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
    currentTurnPlayerId: { type: String, default: null },
    currentTurnColor: { type: String, default: null },
    players: [PlayerSubSchema],
    lastDiceResult: { type: Number, default: null },
    winner: { type: Schema.Types.Mixed, default: null },
    rankings: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

export const GameModel = mongoose.models.Game || mongoose.model<IGame>('Game', GameSchema);
