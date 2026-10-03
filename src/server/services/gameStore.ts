import { AdminAuditLogEntry, ChatMessage, GamePlayer, GameRanking, GameState, GameSummary, PlayerColor } from '../../types/ludo.js';
import { AuditLog } from '../models/AuditLog.js';
import { GameModel } from '../models/Game.js';
import {
  COLOR_ORDER,
  executeTokenMove,
  getNextPlayer,
  getValidMoves,
  rollAuthoritativeDice,
} from './ludoEngine.js';

// Random code generator for clean 6-character room codes (e.g. ABC123)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class GameStore {
  private games: Map<string, GameState> = new Map();
  private socketToPlayerMap: Map<string, { gameId: string; playerId: string }> = new Map();
  private auditLogs: AdminAuditLogEntry[] = [];
  private chatMessages: Map<string, ChatMessage[]> = new Map();
  private isMongoConnected = false;

  constructor() {
    // Audit logs initialized in memory, backed by Mongo if available
  }

  public setMongoConnected(connected: boolean) {
    this.isMongoConnected = connected;
  }

  public createGame(
    hostName: string,
    maxPlayers: 2 | 3 | 4 = 4,
    preferredColor?: PlayerColor
  ): { game: GameState; hostPlayer: GamePlayer } {
    let gameId = generateRoomCode();
    // Ensure code is unique
    while (this.games.has(gameId)) {
      gameId = generateRoomCode();
    }

    const hostId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assignedColor = preferredColor || 'red';

    const hostPlayer: GamePlayer = {
      id: hostId,
      name: hostName.trim() || 'Player 1',
      color: assignedColor,
      tokens: [0, 0, 0, 0],
      connected: true,
      forcedNextDice: null,
      socketId: null,
      isHost: true,
      rank: null,
    };

    const newGame: GameState = {
      gameId,
      status: 'waiting',
      maxPlayers,
      players: [hostPlayer],
      currentTurnPlayerId: null,
      currentTurnColor: null,
      turnPhase: 'roll',
      lastDiceResult: null,
      consecutiveSixes: 0,
      validTokenIndices: [],
      winner: null,
      rankings: [],
      recentActions: [
        {
          id: `act_${Date.now()}`,
          text: `Game ${gameId} created by ${hostPlayer.name}`,
          color: hostPlayer.color,
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.games.set(gameId, newGame);
    this.persistGameAsync(newGame);

    return { game: newGame, hostPlayer };
  }

  public getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId.toUpperCase());
  }

  public joinGame(
    gameId: string,
    playerName: string,
    preferredColor?: PlayerColor,
    existingPlayerId?: string
  ): { success: boolean; error?: string; game?: GameState; player?: GamePlayer } {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);

    if (!game) {
      return { success: false, error: 'Game room not found. Check code.' };
    }

    // Check reconnection with existing playerId
    if (existingPlayerId) {
      const existing = game.players.find((p) => p.id === existingPlayerId);
      if (existing) {
        existing.connected = true;
        game.updatedAt = Date.now();
        return { success: true, game, player: existing };
      }
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game has already started.' };
    }

    if (game.players.length >= game.maxPlayers) {
      return { success: false, error: 'Room is already full.' };
    }

    // Determine available colors
    const usedColors = new Set(game.players.map((p) => p.color));
    let assignedColor: PlayerColor;

    if (preferredColor && !usedColors.has(preferredColor)) {
      assignedColor = preferredColor;
    } else {
      const available = COLOR_ORDER.filter((c) => !usedColors.has(c));
      if (available.length === 0) {
        return { success: false, error: 'No available color spots.' };
      }
      assignedColor = available[0];
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPlayer: GamePlayer = {
      id: playerId,
      name: playerName.trim() || `Player ${game.players.length + 1}`,
      color: assignedColor,
      tokens: [0, 0, 0, 0],
      connected: true,
      forcedNextDice: null,
      socketId: null,
      isHost: false,
      rank: null,
    };

    game.players.push(newPlayer);
    game.recentActions.unshift({
      id: `act_${Date.now()}`,
      text: `${newPlayer.name} joined as ${newPlayer.color.toUpperCase()}`,
      color: newPlayer.color,
      timestamp: Date.now(),
    });
    game.updatedAt = Date.now();

    this.persistGameAsync(game);

    return { success: true, game, player: newPlayer };
  }

  public startGame(
    gameId: string,
    requesterId: string
  ): { success: boolean; error?: string; game?: GameState } {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);

    if (!game) return { success: false, error: 'Game not found' };

    const host = game.players.find((p) => p.isHost);
    if (!host || host.id !== requesterId) {
      return { success: false, error: 'Only room host can start game' };
    }

    if (game.players.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    if (game.status !== 'waiting') {
      return { success: false, error: 'Game already active' };
    }

    game.status = 'in_progress';
    // Starting player is usually Red or first player
    const redPlayer = game.players.find((p) => p.color === 'red');
    const firstPlayer = redPlayer || game.players[0];

    game.currentTurnPlayerId = firstPlayer.id;
    game.currentTurnColor = firstPlayer.color;
    game.turnPhase = 'roll';
    game.lastDiceResult = null;
    game.consecutiveSixes = 0;
    game.validTokenIndices = [];

    game.recentActions.unshift({
      id: `act_${Date.now()}`,
      text: `Game started! ${firstPlayer.name}'s turn to roll.`,
      color: firstPlayer.color,
      timestamp: Date.now(),
    });

    game.updatedAt = Date.now();
    this.persistGameAsync(game);

    return { success: true, game };
  }

  public rollDice(
    gameId: string,
    playerId: string
  ): {
    success: boolean;
    error?: string;
    diceResult?: number;
    wasForced?: boolean;
    validTokens?: number[];
    turnPassedAuto?: boolean;
    game?: GameState;
  } {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);

    if (!game) return { success: false, error: 'Game not found' };
    if (game.status !== 'in_progress') return { success: false, error: 'Game not in progress' };
    if (game.currentTurnPlayerId !== playerId) return { success: false, error: 'Not your turn' };
    if (game.turnPhase !== 'roll') return { success: false, error: 'Token move is pending' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    // Roll authoritatively on server
    const { diceResult, wasForced } = rollAuthoritativeDice(player);
    game.lastDiceResult = diceResult;

    // Check consecutive sixes
    if (diceResult === 6) {
      game.consecutiveSixes += 1;
      if (game.consecutiveSixes >= 3) {
        // 3 consecutive sixes penalty: turn is forfeited
        game.consecutiveSixes = 0;
        game.turnPhase = 'roll';
        game.validTokenIndices = [];

        const nextPlayer = getNextPlayer(game, playerId);
        if (nextPlayer) {
          game.currentTurnPlayerId = nextPlayer.id;
          game.currentTurnColor = nextPlayer.color;
        }

        game.recentActions.unshift({
          id: `act_${Date.now()}`,
          text: `${player.name} rolled three consecutive 6s! Turn forfeited.`,
          color: player.color,
          timestamp: Date.now(),
        });

        game.updatedAt = Date.now();
        this.persistGameAsync(game);

        return {
          success: true,
          diceResult,
          wasForced,
          validTokens: [],
          turnPassedAuto: true,
          game,
        };
      }
    } else {
      game.consecutiveSixes = 0;
    }

    // Calculate valid moves
    const valid = getValidMoves(player, diceResult);
    game.validTokenIndices = valid;

    if (valid.length === 0) {
      // No valid moves possible! Turn automatically passes to next player
      game.turnPhase = 'roll';
      const nextPlayer = getNextPlayer(game, playerId);
      if (nextPlayer) {
        game.currentTurnPlayerId = nextPlayer.id;
        game.currentTurnColor = nextPlayer.color;
      }

      game.recentActions.unshift({
        id: `act_${Date.now()}`,
        text: `${player.name} rolled a ${diceResult} - No moves possible. Turn passes.`,
        color: player.color,
        timestamp: Date.now(),
      });

      game.updatedAt = Date.now();
      this.persistGameAsync(game);

      return {
        success: true,
        diceResult,
        wasForced,
        validTokens: [],
        turnPassedAuto: true,
        game,
      };
    }

    // Valid moves available, transition to move phase
    game.turnPhase = 'move';
    game.recentActions.unshift({
      id: `act_${Date.now()}`,
      text: `${player.name} rolled a ${diceResult} (${valid.length} move${valid.length > 1 ? 's' : ''} available)`,
      color: player.color,
      timestamp: Date.now(),
    });

    game.updatedAt = Date.now();
    this.persistGameAsync(game);

    return {
      success: true,
      diceResult,
      wasForced,
      validTokens: valid,
      turnPassedAuto: false,
      game,
    };
  }

  public moveToken(
    gameId: string,
    playerId: string,
    tokenIndex: number
  ): {
    success: boolean;
    error?: string;
    game?: GameState;
    captured?: { playerId: string; tokenIndex: number; color: PlayerColor };
    bonusRoll?: boolean;
    gameEnded?: boolean;
  } {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);

    if (!game) return { success: false, error: 'Game not found' };

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    const oldStep = player.tokens[tokenIndex];

    const result = executeTokenMove(game, playerId, tokenIndex);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Log action
    if (result.captured) {
      const opp = game.players.find((p) => p.id === result.captured!.playerId);
      game.recentActions.unshift({
        id: `act_${Date.now()}`,
        text: `${player.name} captured ${opp?.name || 'opponent'}'s token! Bonus turn awarded!`,
        color: player.color,
        timestamp: Date.now(),
      });
    } else if (result.reachedHome) {
      game.recentActions.unshift({
        id: `act_${Date.now()}`,
        text: `${player.name} reached HOME with token ${tokenIndex + 1}! Bonus roll awarded!`,
        color: player.color,
        timestamp: Date.now(),
      });
    } else if (oldStep === 0) {
      game.recentActions.unshift({
        id: `act_${Date.now()}`,
        text: `${player.name} entered board with token ${tokenIndex + 1}!`,
        color: player.color,
        timestamp: Date.now(),
      });
    }

    if (result.gameEnded) {
      game.recentActions.unshift({
        id: `act_${Date.now()}`,
        text: `🏆 GAME OVER! Winner: ${game.winner?.name}!`,
        color: game.winner?.color,
        timestamp: Date.now(),
      });
    }

    this.persistGameAsync(game);

    return {
      success: true,
      game,
      captured: result.captured,
      bonusRoll: result.bonusRoll,
      gameEnded: result.gameEnded,
    };
  }

  public setForcedDice(
    gameId: string,
    targetPlayerId: string,
    forcedValue: number | null,
    adminUsername: string
  ): { success: boolean; error?: string; targetPlayer?: GamePlayer; game?: GameState } {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);

    if (!game) return { success: false, error: 'Game not found' };

    const targetPlayer = game.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) return { success: false, error: 'Target player not found in game' };

    // Validate forcedValue: null or integer 1..6
    if (forcedValue !== null && (!Number.isInteger(forcedValue) || forcedValue < 1 || forcedValue > 6)) {
      return { success: false, error: 'Forced dice value must be 1 to 6 or null for random' };
    }

    targetPlayer.forcedNextDice = forcedValue;
    game.updatedAt = Date.now();

    // Create Audit Log Entry
    const auditEntry: AdminAuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gameId: code,
      adminUsername,
      targetPlayerId,
      targetPlayerName: targetPlayer.name,
      forcedValue,
      timestamp: Date.now(),
    };

    this.auditLogs.unshift(auditEntry);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }

    this.persistAuditLogAsync(auditEntry);
    this.persistGameAsync(game);

    return { success: true, targetPlayer, game };
  }

  public registerSocket(socketId: string, gameId: string, playerId: string) {
    this.socketToPlayerMap.set(socketId, { gameId: gameId.toUpperCase(), playerId });
    const game = this.games.get(gameId.toUpperCase());
    if (game) {
      const player = game.players.find((p) => p.id === playerId);
      if (player) {
        player.socketId = socketId;
        player.connected = true;
      }
    }
  }

  public handleSocketDisconnect(socketId: string): { gameId?: string; player?: GamePlayer } {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) return {};

    this.socketToPlayerMap.delete(socketId);
    const game = this.games.get(mapping.gameId);
    if (!game) return {};

    const player = game.players.find((p) => p.id === mapping.playerId);
    if (player) {
      player.connected = false;
      player.socketId = null;
      game.updatedAt = Date.now();
      return { gameId: mapping.gameId, player };
    }

    return {};
  }

  public addChatMessage(
    gameId: string,
    senderId: string,
    text: string
  ): ChatMessage | null {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);
    if (!game) return null;

    const sender = game.players.find((p) => p.id === senderId);
    if (!sender) return null;

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gameId: code,
      senderId,
      senderName: sender.name,
      senderColor: sender.color,
      text: text.slice(0, 100),
      timestamp: Date.now(),
    };

    if (!this.chatMessages.has(code)) {
      this.chatMessages.set(code, []);
    }
    const msgs = this.chatMessages.get(code)!;
    msgs.push(msg);
    if (msgs.length > 50) msgs.shift();

    return msg;
  }

  public getChatMessages(gameId: string): ChatMessage[] {
    return this.chatMessages.get(gameId.toUpperCase()) || [];
  }

  public getAllGamesSummary(): GameSummary[] {
    return Array.from(this.games.values())
      .map((g) => ({
        gameId: g.gameId,
        status: g.status,
        maxPlayers: g.maxPlayers,
        playersCount: g.players.length,
        players: g.players.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          connected: p.connected,
          forcedNextDice: p.forcedNextDice,
        })),
        currentTurnPlayerId: g.currentTurnPlayerId,
        currentTurnPlayerName: g.players.find((p) => p.id === g.currentTurnPlayerId)?.name,
        lastDiceResult: g.lastDiceResult,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getAuditLogs(): AdminAuditLogEntry[] {
    return this.auditLogs;
  }

  public restartGame(gameId: string): { success: boolean; error?: string; game?: GameState } {
    const code = gameId.toUpperCase();
    const game = this.games.get(code);
    if (!game) return { success: false, error: 'Game not found' };

    // Reset tokens and turn
    for (const player of game.players) {
      player.tokens = [0, 0, 0, 0];
      player.forcedNextDice = null;
      player.rank = null;
    }

    game.status = 'in_progress';
    const firstPlayer = game.players.find((p) => p.color === 'red') || game.players[0];
    game.currentTurnPlayerId = firstPlayer ? firstPlayer.id : null;
    game.currentTurnColor = firstPlayer ? firstPlayer.color : null;
    game.turnPhase = 'roll';
    game.lastDiceResult = null;
    game.consecutiveSixes = 0;
    game.validTokenIndices = [];
    game.winner = null;
    game.rankings = [];

    game.recentActions.unshift({
      id: `act_${Date.now()}`,
      text: `Game restarted! ${firstPlayer?.name}'s turn.`,
      color: firstPlayer?.color,
      timestamp: Date.now(),
    });

    game.updatedAt = Date.now();
    this.persistGameAsync(game);

    return { success: true, game };
  }

  private async persistGameAsync(game: GameState) {
    if (!this.isMongoConnected) return;
    try {
      await GameModel.findOneAndUpdate(
        { gameId: game.gameId },
        {
          gameId: game.gameId,
          status: game.status,
          maxPlayers: game.maxPlayers,
          currentTurnPlayerId: game.currentTurnPlayerId,
          currentTurnColor: game.currentTurnColor,
          players: game.players,
          lastDiceResult: game.lastDiceResult,
          winner: game.winner,
          rankings: game.rankings,
        },
        { upsert: true }
      );
    } catch (err) {
      // In-memory remains authoritative, log quietly
      console.warn('MongoDB sync error:', (err as Error).message);
    }
  }

  private async persistAuditLogAsync(entry: AdminAuditLogEntry) {
    if (!this.isMongoConnected) return;
    try {
      await AuditLog.create({
        gameId: entry.gameId,
        adminUsername: entry.adminUsername,
        targetPlayerId: entry.targetPlayerId,
        targetPlayerName: entry.targetPlayerName,
        forcedValue: entry.forcedValue,
        timestamp: new Date(entry.timestamp),
      });
    } catch (err) {
      console.warn('AuditLog persist error:', (err as Error).message);
    }
  }
}

export const gameStore = new GameStore();
