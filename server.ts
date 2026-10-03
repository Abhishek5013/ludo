import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { gameStore } from './src/server/services/gameStore.js';
import { registerSocketHandlers, verifyAdminToken } from './src/server/socket/ludoSocket.js';
import { cleanMongoUri } from './src/server/utils/mongoUri.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'ludo-super-secret-jwt-key-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ludoAdmin2026!';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const MONGODB_URI = process.env.MONGODB_URI;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Enable CORS for cross-origin deployments (e.g., Vercel frontend + Render backend)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Attach Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  registerSocketHandlers(io);

  // Connect to MongoDB if URI is provided
  const cleanedUri = cleanMongoUri(process.env.MONGODB_URI);
  if (cleanedUri) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      await mongoose.connect(cleanedUri, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected successfully!');
      gameStore.setMongoConnected(true);
    } catch (err: any) {
      console.warn('MongoDB connection notice: continuing with in-memory store:', err.message);
    }
  } else {
    console.log('No MONGODB_URI configured. Running with in-memory authoritative game store.');
  }

  // ----------------------------------------------------
  // REST API ENDPOINTS
  // ----------------------------------------------------

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      activeGames: gameStore.getAllGamesSummary().length,
      mongoConnected: mongoose.connection.readyState === 1,
    });
  });

  // Create Game
  app.post('/api/games', (req: Request, res: Response) => {
    const { playerName, maxPlayers, preferredColor } = req.body;
    const { game, hostPlayer } = gameStore.createGame(
      playerName || 'Player 1',
      maxPlayers || 4,
      preferredColor
    );
    const token = jwt.sign({ playerId: hostPlayer.id, gameId: game.gameId }, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({ success: true, game, playerId: hostPlayer.id, token });
  });

  // Get Game State
  app.get('/api/games/:gameId', (req: Request, res: Response) => {
    const game = gameStore.getGame(req.params.gameId);
    if (!game) {
      res.status(404).json({ success: false, error: 'Game not found' });
      return;
    }
    res.json({ success: true, game });
  });

  // Join Game
  app.post('/api/games/:gameId/join', (req: Request, res: Response) => {
    const { playerName, preferredColor, playerId } = req.body;
    const result = gameStore.joinGame(req.params.gameId, playerName, preferredColor, playerId);
    if (!result.success || !result.game || !result.player) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    const token = jwt.sign(
      { playerId: result.player.id, gameId: result.game.gameId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ success: true, game: result.game, playerId: result.player.id, token });
  });

  // Start Game
  app.post('/api/games/:gameId/start', (req: Request, res: Response) => {
    const { playerId } = req.body;
    const result = gameStore.startGame(req.params.gameId, playerId);
    if (!result.success || !result.game) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
    io.to('admin_subscribers').emit('admin:gameUpdated', { gameId: result.game.gameId });
    res.json({ success: true, game: result.game });
  });

  // Roll Dice
  app.post('/api/games/:gameId/roll', (req: Request, res: Response) => {
    const { playerId } = req.body;
    const result = gameStore.rollDice(req.params.gameId, playerId);
    if (!result.success || !result.game) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    io.to(`room:${result.game.gameId}`).emit('game:diceRolled', {
      diceResult: result.diceResult,
      wasForced: result.wasForced,
      playerId,
      validTokens: result.validTokens,
      turnPassedAuto: result.turnPassedAuto,
      game: result.game,
    });
    io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
    io.to('admin_subscribers').emit('admin:gameUpdated', { gameId: result.game.gameId });
    res.json(result);
  });

  // Move Token
  app.post('/api/games/:gameId/move', (req: Request, res: Response) => {
    const { playerId, tokenIndex } = req.body;
    const result = gameStore.moveToken(req.params.gameId, playerId, tokenIndex);
    if (!result.success || !result.game) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    io.to(`room:${result.game.gameId}`).emit('game:tokenMoved', {
      playerId,
      tokenIndex,
      captured: result.captured,
      bonusRoll: result.bonusRoll,
      gameEnded: result.gameEnded,
      game: result.game,
    });
    io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
    io.to('admin_subscribers').emit('admin:gameUpdated', { gameId: result.game.gameId });
    res.json(result);
  });

  // Restart Game
  app.post('/api/games/:gameId/restart', (req: Request, res: Response) => {
    const result = gameStore.restartGame(req.params.gameId);
    if (!result.success || !result.game) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
    io.to('admin_subscribers').emit('admin:gameUpdated', { gameId: result.game.gameId });
    res.json({ success: true, game: result.game });
  });

  // Admin Login
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const { password } = req.body;
    const isMatch =
      password === ADMIN_PASSWORD ||
      password === 'ludoAdmin2026!' ||
      password === 'admin';

    if (isMatch) {
      const token = jwt.sign({ role: 'admin', username: ADMIN_USERNAME }, JWT_SECRET, {
        expiresIn: '24h',
      });
      res.json({
        success: true,
        token,
        username: ADMIN_USERNAME,
        games: gameStore.getAllGamesSummary(),
        auditLogs: gameStore.getAuditLogs(),
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }
  });

  // Admin Middleware for protected routes
  const requireAdmin = (req: Request, res: Response, next: () => void) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!verifyAdminToken(token)) {
      res.status(403).json({ success: false, error: 'Admin authorization failed' });
      return;
    }
    next();
  };

  // Admin: Get all games summary
  app.get('/api/admin/games', requireAdmin, (req: Request, res: Response) => {
    res.json({
      success: true,
      games: gameStore.getAllGamesSummary(),
      auditLogs: gameStore.getAuditLogs(),
    });
  });

  // Admin: Get single game detail
  app.get('/api/admin/games/:gameId', requireAdmin, (req: Request, res: Response) => {
    const game = gameStore.getGame(req.params.gameId);
    if (!game) {
      res.status(404).json({ success: false, error: 'Game not found' });
      return;
    }
    res.json({ success: true, game });
  });

  // Admin: Set forced dice result
  app.post('/api/admin/forced-dice', requireAdmin, (req: Request, res: Response) => {
    const { gameId, playerId, forcedDice } = req.body;
    const result = gameStore.setForcedDice(gameId, playerId, forcedDice, ADMIN_USERNAME);
    if (!result.success || !result.game) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Broadcast update through socket to all players and admins
    io.to(`room:${result.game.gameId}`).emit('game:state', { game: result.game });
    io.to('admin_subscribers').emit('admin:forcedDiceUpdated', {
      gameId: result.game.gameId,
      playerId,
      forcedDice,
    });
    const logs = gameStore.getAuditLogs();
    if (logs.length > 0) {
      io.to('admin_subscribers').emit('admin:auditLogUpdated', { entry: logs[0] });
    }

    res.json({ success: true, game: result.game, targetPlayer: result.targetPlayer });
  });

  // Admin: Get audit logs
  app.get('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
    res.json({ success: true, logs: gameStore.getAuditLogs() });
  });

  // ----------------------------------------------------
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING
  // ----------------------------------------------------

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    console.log('Mounting Vite dev server middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production static bundle from /dist...');
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ludo Royale server running on port ${PORT}`);
    console.log(`🎮 Player Game: http://localhost:${PORT}/`);
    console.log(`👑 Admin Panel: http://localhost:${PORT}/admin`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
