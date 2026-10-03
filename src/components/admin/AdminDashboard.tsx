import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { AdminAuditLogEntry, GameState, GameSummary, PlayerColor } from '../../types/ludo.js';
import { getApiBaseUrl } from '../../utils/apiUrl.js';
import { LudoBoard } from '../board/LudoBoard.js';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  Dices,
  Eye,
  History,
  Lock,
  LogOut,
  RefreshCw,
  RotateCcw,
  Shield,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

interface AdminDashboardProps {
  socket: Socket | null;
  onNavigateHome: () => void;
  onOpenPlayerGame: (gameId: string) => void;
}

const COLOR_TEXT: Record<PlayerColor, string> = {
  red: 'text-rose-400',
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  blue: 'text-sky-400',
};

const COLOR_BG: Record<PlayerColor, string> = {
  red: 'bg-rose-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  blue: 'bg-sky-500',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  socket,
  onNavigateHome,
  onOpenPlayerGame,
}) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ludo_admin_token'));
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Admin Data
  const [games, setGames] = useState<GameSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [liveGameState, setLiveGameState] = useState<GameState | null>(null);
  const [loadingGame, setLoadingGame] = useState(false);

  // Status message notification
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      setIsLoggingIn(false);

      if (data && data.success) {
        setToken(data.token);
        localStorage.setItem('ludo_admin_token', data.token);
        setGames(data.games || []);
        setAuditLogs(data.auditLogs || []);
        showStatus('Admin authenticated successfully!');

        if (socket) {
          socket.emit('admin:subscribe', { token: data.token });
        }
      } else {
        setAuthError(data?.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setIsLoggingIn(false);
      setAuthError('Connection error: ' + (err.message || 'Unable to reach server'));
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('ludo_admin_token');
    setSelectedGameId(null);
    setLiveGameState(null);
  };

  // Load / Refresh Data
  const refreshAdminData = () => {
    if (!token) return;
    fetch(`${getApiBaseUrl()}/api/admin/games`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 403) {
          handleLogout();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.success) {
          setGames(data.games);
          setAuditLogs(data.auditLogs);
        }
      })
      .catch(() => {});
  };

  // Fetch full state for selected game
  const loadSingleGame = (gameId: string) => {
    setSelectedGameId(gameId);
    setLoadingGame(true);
    fetch(`${getApiBaseUrl()}/api/admin/games/${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setLoadingGame(false);
        if (data.success) {
          setLiveGameState(data.game);
        }
      })
      .catch(() => {
        setLoadingGame(false);
      });
  };

  // Real-time Socket.IO listeners
  useEffect(() => {
    if (!socket || !token) return;

    const subscribeAdmin = () => {
      socket.emit('admin:subscribe', { token }, (res: any) => {
        if (res && res.success) {
          setGames(res.games || []);
          setAuditLogs(res.auditLogs || []);
        }
      });
    };

    if (socket.connected) {
      subscribeAdmin();
    }
    socket.on('connect', subscribeAdmin);

    // Listen for live forced dice changes across devices
    socket.on('admin:forcedDiceUpdated', (payload: { gameId: string; playerId: string; forcedDice: number | null }) => {
      setGames((prev) =>
        prev.map((g) => {
          if (g.gameId === payload.gameId) {
            return {
              ...g,
              players: g.players.map((p) =>
                p.id === payload.playerId ? { ...p, forcedNextDice: payload.forcedDice } : p
              ),
            };
          }
          return g;
        })
      );

      setLiveGameState((prev) => {
        if (prev && prev.gameId === payload.gameId) {
          return {
            ...prev,
            players: prev.players.map((p) =>
              p.id === payload.playerId ? { ...p, forcedNextDice: payload.forcedDice } : p
            ),
          };
        }
        return prev;
      });
    });

    // Listen for audit log updates
    socket.on('admin:auditLogUpdated', (payload: { entry: AdminAuditLogEntry }) => {
      setAuditLogs((prev) => [payload.entry, ...prev.slice(0, 49)]);
    });

    // Listen for any game update
    socket.on('admin:gameUpdated', (payload: { gameId: string }) => {
      refreshAdminData();
      if (selectedGameId && selectedGameId === payload.gameId) {
        loadSingleGame(payload.gameId);
      }
    });

    return () => {
      socket.off('connect', subscribeAdmin);
      socket.off('admin:forcedDiceUpdated');
      socket.off('admin:auditLogUpdated');
      socket.off('admin:gameUpdated');
    };
  }, [socket, token, selectedGameId]);

  // Set Forced Dice handler (Real-time per player via REST & Socket broadcast!)
  const handleSetForcedDice = async (playerId: string, forcedValue: number | null) => {
    if (!selectedGameId || !token) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/forced-dice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: selectedGameId,
          playerId,
          forcedDice: forcedValue,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setLiveGameState(data.game);
        showStatus(
          forcedValue === null
            ? 'Player set to Random Dice'
            : `Next roll for ${data.targetPlayer?.name} forced to ${forcedValue}!`
        );
      } else {
        showStatus(data?.error || 'Failed to update forced dice', 'error');
      }
    } catch (err: any) {
      showStatus(err.message || 'Network error updating dice', 'error');
    }
  };

  // Restart game handler
  const handleRestartGame = (gameId: string) => {
    if (socket && socket.connected) {
      socket.emit('game:restart', { gameId }, (res: any) => {
        if (res && res.success) {
          setLiveGameState(res.game);
          showStatus('Game restarted successfully!');
        }
      });
    } else {
      showStatus('Reconnecting to game server...');
    }
  };

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="text-xl font-black text-slate-100 font-display">
            Ludo Admin Control
          </h2>
          <p className="text-xs text-slate-400 text-center mt-1">
            Real-time live multi-device dice manipulation & game monitoring
          </p>

          {authError && (
            <div className="w-full mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="w-full mt-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (default: ludoAdmin2026!)"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 cursor-pointer transition-all active:scale-95"
            >
              {isLoggingIn ? 'Verifying...' : 'Access Admin Dashboard'}
            </button>
          </form>

          <button
            type="button"
            onClick={onNavigateHome}
            className="mt-5 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Player Game
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // ADMIN DASHBOARD MAIN VIEW
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col py-5 px-4 sm:px-6">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 font-display flex items-center gap-2">
              Ludo Admin Control Center
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-sans font-bold">
                DEVICE B READY
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Live dice control, multi-device synchronization & audit logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refreshAdminData}
            title="Refresh game list"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Player Lobby</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* LEFT COLUMN: ACTIVE GAMES LIST (4 COLS) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Active Games ({games.length})
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">Live Sockets</span>
            </div>

            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
              {games.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No active games yet. Create one from the Lobby to start!
                </div>
              ) : (
                games.map((g) => {
                  const isSelected = selectedGameId === g.gameId;
                  return (
                    <button
                      key={g.gameId}
                      type="button"
                      onClick={() => loadSingleGame(g.gameId)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-amber-400 tracking-wider">
                          {g.gameId}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            g.status === 'in_progress'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : g.status === 'finished'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {g.status === 'in_progress'
                            ? 'LIVE'
                            : g.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {g.playersCount}/{g.maxPlayers} Players
                        </span>
                        {g.currentTurnPlayerName && (
                          <span className="truncate max-w-[120px]">
                            Turn: <strong>{g.currentTurnPlayerName}</strong>
                          </span>
                        )}
                      </div>

                      {/* Player Colors Badges */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {g.players.map((p) => (
                          <span
                            key={p.id}
                            title={`${p.name} (${p.color})`}
                            className={`w-2.5 h-2.5 rounded-full ${COLOR_BG[p.color]}`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ADMIN AUDIT LOG BOX (Section 22) */}
          <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col gap-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-800">
              <History className="w-4 h-4 text-amber-400" />
              Audit Log (Live Dice Overrides)
            </h3>
            <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No dice override actions logged yet.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-amber-400 font-mono">{log.gameId}</span>
                      <span className="text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Target: <strong>{log.targetPlayerName}</strong> &rarr;{' '}
                      <span className="font-bold text-amber-300">
                        {log.forcedValue !== null ? `Dice: ${log.forcedValue}` : 'Random'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED GAME LIVE CONTROL & SPECTATOR (8 COLS) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {selectedGameId && liveGameState ? (
            <div className="bg-slate-900/70 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl flex flex-col gap-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-black text-slate-100 font-display">
                      Game: <span className="font-mono text-amber-400">{liveGameState.gameId}</span>
                    </h2>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        liveGameState.status === 'in_progress'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {liveGameState.status === 'in_progress' ? 'LIVE' : liveGameState.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Current Turn:{' '}
                    <strong className="text-slate-200">
                      {liveGameState.players.find((p) => p.id === liveGameState.currentTurnPlayerId)?.name || 'None'}
                    </strong>{' '}
                    (Phase: {liveGameState.turnPhase.toUpperCase()})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestartGame(liveGameState.gameId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPlayerGame(liveGameState.gameId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open as Player
                  </button>
                </div>
              </div>

              {/* REQUIRED FEATURE: PER-PLAYER FORCED DICE CONTROL (Sections 9, 10, 11, 12) */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
                <h3 className="text-xs uppercase font-black tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                  <Dices className="w-4 h-4" />
                  Per-Player Real-Time Next Dice Result
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Select a forced value for any player. When that player rolls next on Device A,
                  the server returns the forced value and automatically removes it for following rolls.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {liveGameState.players.map((player) => {
                    const isTurn = liveGameState.currentTurnPlayerId === player.id;
                    return (
                      <div
                        key={player.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                          isTurn
                            ? 'bg-slate-900/90 border-amber-500/40 ring-1 ring-amber-500/20'
                            : 'bg-slate-900/50 border-slate-800'
                        }`}
                      >
                        {/* Player Info Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-3.5 h-3.5 rounded-full ${COLOR_BG[player.color]}`} />
                            <span className="font-bold text-xs text-slate-100 truncate">
                              {player.name}
                            </span>
                            {isTurn && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black">
                                TURN
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {player.connected ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                <Wifi className="w-3 h-3" /> Online
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-rose-400">
                                <WifiOff className="w-3 h-3" /> Offline
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Forced Status Badge */}
                        <div className="text-[11px] flex items-center justify-between">
                          <span className="text-slate-400">Next Dice:</span>
                          <span
                            className={`font-black px-2 py-0.5 rounded-md ${
                              player.forcedNextDice !== null
                                ? 'bg-amber-500 text-slate-950 font-mono'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {player.forcedNextDice !== null
                              ? `Forced: ${player.forcedNextDice}`
                              : 'Random'}
                          </span>
                        </div>

                        {/* Dice Selector Buttons [Random] [1] [2] [3] [4] [5] [6] */}
                        <div className="grid grid-cols-7 gap-1 pt-1 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleSetForcedDice(player.id, null)}
                            className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              player.forcedNextDice === null
                                ? 'bg-slate-700 text-white border border-slate-500'
                                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                            }`}
                            title="Reset to normal random"
                          >
                            Rnd
                          </button>
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleSetForcedDice(player.id, num)}
                              className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                player.forcedNextDice === num
                                  ? 'bg-amber-500 text-slate-950 shadow-md scale-105 ring-2 ring-amber-300'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LIVE BOARD SPECTATOR PREVIEW */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase font-bold text-slate-400">
                    Live Board Spectator
                  </h4>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Synchronized Live
                  </span>
                </div>
                <div className="w-full max-w-sm">
                  <LudoBoard
                    game={liveGameState}
                    onMoveToken={() => {}}
                    validTokenIndices={[]}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed flex flex-col items-center justify-center p-8 text-center">
              <Dices className="w-12 h-12 text-slate-700 mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Game Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select an active game from the list on the left to monitor live player positions
                and control the next dice roll in real time.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
