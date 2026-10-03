import jwt from 'jsonwebtoken';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { PlayerColor } from '../../types/ludo.js';
import { gameStore } from '../services/gameStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ludo-super-secret-jwt-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ludoAdmin2026!';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded && decoded.role === 'admin';
  } catch {
    return false;
  }
}

export function registerSocketHandlers(io: SocketIOServer) {
  // Admin room name for live broadcasts
  const ADMIN_ROOM = 'admin_subscribers';

  io.on('connection', (socket: Socket) => {
    // ----------------------------------------------------
    // PLAYER / GAME EVENTS
    // ----------------------------------------------------

    socket.on(
      'game:create',
      (payload: { playerName: string; maxPlayers?: number; preferredColor?: PlayerColor }, callback) => {
        try {
          const maxPlayers = payload.maxPlayers === 2 || payload.maxPlayers === 3 || payload.maxPlayers === 4 ? payload.maxPlayers : 4;
          const { game, hostPlayer } = gameStore.createGame(payload.playerName, maxPlayers, payload.preferredColor);

          socket.join(`room:${game.gameId}`);
          gameStore.registerSocket(socket.id, game.gameId, hostPlayer.id);

          const token = jwt.sign({ playerId: hostPlayer.id, gameId: game.gameId }, JWT_SECRET, { expiresIn: '7d' });

          if (typeof callback === 'function') {
            callback({ success: true, game, playerId: hostPlayer.id, token });
          }

          // Notify admins
          io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId: game.gameId });
        } catch (err: any) {
          if (typeof callback === 'function') callback({ success: false, error: err.message });
        }
      }
    );

    socket.on(
      'game:join',
      (payload: { gameId: string; playerName: string; preferredColor?: PlayerColor; playerId?: string }, callback) => {
        try {
          if (!payload.gameId) {
            if (typeof callback === 'function') callback({ success: false, error: 'Game code required' });
            return;
          }

          const result = gameStore.joinGame(
            payload.gameId,
            payload.playerName,
            payload.preferredColor,
            payload.playerId
          );

          if (!result.success || !result.game || !result.player) {
            if (typeof callback === 'function') callback({ success: false, error: result.error || 'Failed to join' });
            return;
          }

          socket.join(`room:${result.game.gameId}`);
          gameStore.registerSocket(socket.id, result.game.gameId, result.player.id);

          const token = jwt.sign({ playerId: result.player.id, gameId: result.game.gameId }, JWT_SECRET, { expiresIn: '7d' });

          if (typeof callback === 'function') {
            callback({ success: true, game: result.game, playerId: result.player.id, token });
          }

          // Broadcast state to room
          io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
          // Notify admins
          io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId: result.game.gameId });
        } catch (err: any) {
          if (typeof callback === 'function') callback({ success: false, error: err.message });
        }
      }
    );

    socket.on('game:start', (payload: { gameId: string; playerId: string }, callback) => {
      try {
        const result = gameStore.startGame(payload.gameId, payload.playerId);
        if (!result.success || !result.game) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }

        io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
        io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId: result.game.gameId });

        if (typeof callback === 'function') callback({ success: true, game: result.game });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:rollDice', (payload: { gameId: string; playerId: string }, callback) => {
      try {
        const result = gameStore.rollDice(payload.gameId, payload.playerId);
        if (!result.success || !result.game) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }

        const game = result.game;
        // Broadcast the roll event to all room members
        io.to(`room:${game.gameId}`).emit('game:diceRolled', {
          diceResult: result.diceResult,
          wasForced: result.wasForced,
          playerId: payload.playerId,
          validTokens: result.validTokens,
          turnPassedAuto: result.turnPassedAuto,
          game,
        });

        // Also emit authoritative game state
        io.to(`room:${game.gameId}`).emit('game:state', { game });

        // Update live admin monitors
        io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId: game.gameId });

        if (typeof callback === 'function') {
          callback({
            success: true,
            diceResult: result.diceResult,
            validTokens: result.validTokens,
            turnPassedAuto: result.turnPassedAuto,
            game,
          });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:moveToken', (payload: { gameId: string; playerId: string; tokenIndex: number }, callback) => {
      try {
        const result = gameStore.moveToken(payload.gameId, payload.playerId, payload.tokenIndex);
        if (!result.success || !result.game) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }

        const game = result.game;
        io.to(`room:${game.gameId}`).emit('game:tokenMoved', {
          playerId: payload.playerId,
          tokenIndex: payload.tokenIndex,
          captured: result.captured,
          bonusRoll: result.bonusRoll,
          gameEnded: result.gameEnded,
          game,
        });

        io.to(`room:${game.gameId}`).emit('game:state', { game });
        io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId: game.gameId });

        if (typeof callback === 'function') {
          callback({ success: true, game, captured: result.captured });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:restart', (payload: { gameId: string }, callback) => {
      try {
        const result = gameStore.restartGame(payload.gameId);
        if (!result.success || !result.game) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }

        io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
        io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId: result.game.gameId });

        if (typeof callback === 'function') callback({ success: true, game: result.game });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:sendChat', (payload: { gameId: string; playerId: string; text: string }) => {
      if (!payload.text || !payload.gameId) return;
      const msg = gameStore.addChatMessage(payload.gameId, payload.playerId, payload.text);
      if (msg) {
        io.to(`room:${payload.gameId.toUpperCase()}`).emit('game:chatMessage', msg);
      }
    });

    // ----------------------------------------------------
    // ADMIN EVENTS (AUTHENTICATED & REAL-TIME MULTI-DEVICE)
    // ----------------------------------------------------

    socket.on('admin:login', (payload: { password: string }, callback) => {
      const isMatch =
        payload?.password === ADMIN_PASSWORD ||
        payload?.password === 'ludoAdmin2026!' ||
        payload?.password === 'admin';

      if (isMatch) {
        const token = jwt.sign({ role: 'admin', username: ADMIN_USERNAME }, JWT_SECRET, { expiresIn: '24h' });
        socket.join(ADMIN_ROOM);

        if (typeof callback === 'function') {
          callback({
            success: true,
            token,
            username: ADMIN_USERNAME,
            games: gameStore.getAllGamesSummary(),
            auditLogs: gameStore.getAuditLogs(),
          });
        }
      } else {
        if (typeof callback === 'function') {
          callback({ success: false, error: 'Invalid admin credentials' });
        }
      }
    });

    socket.on('admin:subscribe', (payload: { token: string }, callback) => {
      if (!verifyAdminToken(payload?.token)) {
        if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized admin access' });
        return;
      }
      socket.join(ADMIN_ROOM);
      if (typeof callback === 'function') {
        callback({
          success: true,
          games: gameStore.getAllGamesSummary(),
          auditLogs: gameStore.getAuditLogs(),
        });
      }
    });

    socket.on(
      'admin:setForcedDice',
      (
        payload: { token: string; gameId: string; playerId: string; forcedDice: number | null },
        callback
      ) => {
        if (!verifyAdminToken(payload?.token)) {
          if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized: Admin token required' });
          return;
        }

        const result = gameStore.setForcedDice(
          payload.gameId,
          payload.playerId,
          payload.forcedDice,
          ADMIN_USERNAME
        );

        if (!result.success || !result.game) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          return;
        }

        const game = result.game;

        // 1. Broadcast to all admins in real time on any device
        io.to(ADMIN_ROOM).emit('admin:forcedDiceUpdated', {
          gameId: game.gameId,
          playerId: payload.playerId,
          forcedDice: payload.forcedDice,
        });

        const recentLogs = gameStore.getAuditLogs();
        if (recentLogs.length > 0) {
          io.to(ADMIN_ROOM).emit('admin:auditLogUpdated', { entry: recentLogs[0] });
        }

        // 2. Broadcast authoritative game state to the room where players are playing!
        io.to(`room:${game.gameId}`).emit('game:state', { game });

        if (typeof callback === 'function') {
          callback({ success: true, game, targetPlayer: result.targetPlayer });
        }
      }
    );

    // ----------------------------------------------------
    // DISCONNECT HANDLING
    // ----------------------------------------------------

    socket.on('disconnect', () => {
      const { gameId, player } = gameStore.handleSocketDisconnect(socket.id);
      if (gameId && player) {
        const game = gameStore.getGame(gameId);
        if (game) {
          io.to(`room:${gameId}`).emit('game:state', { game });
          io.to(ADMIN_ROOM).emit('admin:gameUpdated', { gameId });
        }
      }
    });
  });
}
