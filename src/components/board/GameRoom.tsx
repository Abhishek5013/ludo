import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { ChatMessage, GamePlayer, GameState, PlayerColor } from '../../types/ludo.js';
import { getApiBaseUrl } from '../../utils/apiUrl.js';
import { sounds } from '../../utils/audio.js';
import { ChatDrawer } from './ChatDrawer.js';
import { Dice3D } from './Dice3D.js';
import { GameControls } from './GameControls.js';
import { LudoBoard } from './LudoBoard.js';
import { PlayerCard } from './PlayerCard.js';
import { VictoryModal } from './VictoryModal.js';
import { ArrowLeft, Dices, Volume2, VolumeX, Shield } from 'lucide-react';

interface GameRoomProps {
  gameId: string;
  socket: Socket | null;
  onNavigateHome: () => void;
  onNavigateToAdmin: () => void;
}

export const GameRoom: React.FC<GameRoomProps> = ({
  gameId,
  socket,
  onNavigateHome,
  onNavigateToAdmin,
}) => {
  const [game, setGame] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return localStorage.getItem(`ludo_player_${gameId}`) || null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(`ludo_token_${gameId}`) || null;
  });

  // Direct join prompt if visiting URL without being registered in room
  const [needsJoin, setNeedsJoin] = useState(false);
  const [joinName, setJoinName] = useState('Player');
  const [joinColor, setJoinColor] = useState<PlayerColor>('red');
  const [isJoining, setIsJoining] = useState(false);

  // Gameplay state
  const [isRolling, setIsRolling] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial game state via REST or Socket
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/api/games/${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGame(data.game);
          // Check if myPlayerId is actually inside the game
          const existing = data.game.players.find((p: GamePlayer) => p.id === myPlayerId);
          if (!existing) {
            setNeedsJoin(true);
          }
        } else {
          setErrorMessage(data.error || 'Game not found');
        }
      })
      .catch((err) => {
        setErrorMessage(err.message);
      });
  }, [gameId, myPlayerId]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    const registerOnSocket = () => {
      if (myPlayerId) {
        socket.emit(
          'game:join',
          { gameId, playerName: '', playerId: myPlayerId },
          (res: any) => {
            if (res && res.success) {
              setGame(res.game);
              setNeedsJoin(false);
            }
          }
        );
      }
    };

    if (socket.connected) {
      registerOnSocket();
    }
    socket.on('connect', registerOnSocket);

    socket.on('game:state', (payload: { game: GameState }) => {
      setGame(payload.game);
    });

    socket.on(
      'game:diceRolled',
      (payload: {
        diceResult: number;
        wasForced: boolean;
        playerId: string;
        validTokens: number[];
        turnPassedAuto?: boolean;
        game: GameState;
      }) => {
        setIsRolling(true);
        setTimeout(() => {
          setIsRolling(false);
          setGame(payload.game);
        }, 600);
      }
    );

    socket.on('game:tokenMoved', (payload: any) => {
      sounds.playTokenMove();
      if (payload.captured) {
        sounds.playCapture();
      }
      setGame(payload.game);
    });

    socket.on('game:chatMessage', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('game:error', (err: { message: string }) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 3500);
    });

    return () => {
      socket.off('connect', registerOnSocket);
      socket.off('game:state');
      socket.off('game:diceRolled');
      socket.off('game:tokenMoved');
      socket.off('game:chatMessage');
      socket.off('game:error');
    };
  }, [socket, gameId, myPlayerId]);

  // Handle direct join form submission
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinName.trim()) return;
    setIsJoining(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: joinName.trim(),
          preferredColor: joinColor,
        }),
      });
      const data = await res.json();
      setIsJoining(false);

      if (data && data.success) {
        setGame(data.game);
        setMyPlayerId(data.playerId);
        setToken(data.token);
        localStorage.setItem(`ludo_player_${gameId}`, data.playerId);
        localStorage.setItem(`ludo_token_${gameId}`, data.token);
        setNeedsJoin(false);

        if (socket && socket.connected) {
          socket.emit('game:join', { gameId, playerName: joinName.trim(), playerId: data.playerId });
        }
      } else {
        setErrorMessage(data?.error || 'Failed to join game');
      }
    } catch (err: any) {
      setIsJoining(false);
      setErrorMessage(err.message || 'Network error joining game');
    }
  };

  // Actions: Dual-channel (Socket + REST fallback) for absolute responsiveness
  const handleStartGame = () => {
    if (!myPlayerId) return;
    if (socket && socket.connected) {
      socket.emit('game:start', { gameId, playerId: myPlayerId });
    } else {
      fetch(`${getApiBaseUrl()}/api/games/${gameId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) setGame(data.game);
        })
        .catch(() => {});
    }
  };

  const handleRollDice = () => {
    if (!myPlayerId || isRolling) return;
    setIsRolling(true);
    if (socket && socket.connected) {
      socket.emit('game:rollDice', { gameId, playerId: myPlayerId });
    } else {
      fetch(`${getApiBaseUrl()}/api/games/${gameId}/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setTimeout(() => {
              setIsRolling(false);
              setGame(data.game);
            }, 500);
          } else {
            setIsRolling(false);
          }
        })
        .catch(() => setIsRolling(false));
    }
  };

  const handleMoveToken = (tokenIndex: number) => {
    if (!myPlayerId) return;
    if (socket && socket.connected) {
      socket.emit('game:moveToken', { gameId, playerId: myPlayerId, tokenIndex });
    } else {
      fetch(`${getApiBaseUrl()}/api/games/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: myPlayerId, tokenIndex }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) setGame(data.game);
        })
        .catch(() => {});
    }
  };

  const handleRestartGame = () => {
    if (socket && socket.connected) {
      socket.emit('game:restart', { gameId });
    } else {
      fetch(`${getApiBaseUrl()}/api/games/${gameId}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) setGame(data.game);
        })
        .catch(() => {});
    }
  };

  const handleSendMessage = (text: string) => {
    if (!myPlayerId) return;
    if (socket && socket.connected) {
      socket.emit('game:sendChat', { gameId, playerId: myPlayerId, text });
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    sounds.setMuted(next);
    setIsMuted(next);
  };

  if (errorMessage && !game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-800 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
            <ArrowLeft className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Unable to Load Game</h2>
          <p className="text-xs text-rose-400 mt-1">{errorMessage}</p>
          <button
            type="button"
            onClick={onNavigateHome}
            className="mt-6 py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // If user opened URL without joining
  if (needsJoin && game) {
    const usedColors = new Set(game.players.map((p) => p.color));
    const availableColors: PlayerColor[] = (['red', 'green', 'yellow', 'blue'] as PlayerColor[]).filter(
      (c) => !usedColors.has(c)
    );

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-800 shadow-2xl flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
            <Dices className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-slate-100 font-display">Join Game {gameId}</h2>
          <p className="text-xs text-slate-400 text-center mt-1">
            Choose your name and color to enter the table
          </p>

          <form onSubmit={handleJoinGame} className="w-full mt-5 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Enter player name"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Select Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['red', 'green', 'yellow', 'blue'] as PlayerColor[]).map((c) => {
                  const isTaken = usedColors.has(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={isTaken}
                      onClick={() => setJoinColor(c)}
                      className={`py-2 rounded-xl border flex flex-col items-center gap-1 text-[11px] font-semibold capitalize transition-all ${
                        isTaken
                          ? 'opacity-30 border-slate-800 cursor-not-allowed'
                          : joinColor === c
                          ? 'border-amber-400 bg-slate-800 ring-2 ring-amber-400/40 cursor-pointer'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-900 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${
                          c === 'red'
                            ? 'bg-rose-500'
                            : c === 'green'
                            ? 'bg-emerald-500'
                            : c === 'yellow'
                            ? 'bg-amber-400'
                            : 'bg-sky-500'
                        }`}
                      />
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isJoining || availableColors.length === 0}
              className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
            >
              {isJoining ? 'Joining...' : 'Enter Table'}
            </button>
          </form>

          <button
            type="button"
            onClick={onNavigateHome}
            className="mt-4 text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <Dices className="w-6 h-6 text-amber-400 animate-spin mr-2" />
        Connecting to Ludo Royale game table...
      </div>
    );
  }

  const myPlayer = game.players.find((p) => p.id === myPlayerId);
  const isHost = myPlayer?.isHost || false;
  const isMyTurn = game.currentTurnPlayerId === myPlayerId;
  const canRoll = isMyTurn && game.turnPhase === 'roll' && game.status === 'in_progress';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-4 px-3 sm:px-6">
      {/* Top Navbar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Lobby</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            type="button"
            onClick={onNavigateToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-amber-400 border border-amber-500/30 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        </div>
      </header>

      {/* Main Game Container */}
      <main className="max-w-5xl mx-auto w-full my-auto py-3 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* LEFT / TOP PLAYER CARDS (Cols 1-3) */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible">
          {game.players.slice(0, 2).map((player) => (
            <div key={player.id} className="flex-1 lg:flex-none min-w-[150px]">
              <PlayerCard
                player={player}
                isCurrentTurn={game.currentTurnPlayerId === player.id}
                isSelf={player.id === myPlayerId}
              />
            </div>
          ))}
        </div>

        {/* CENTER: LUDO BOARD & DICE (Cols 4-9) */}
        <div className="lg:col-span-6 flex flex-col items-center gap-3">
          <LudoBoard
            game={game}
            myPlayerId={myPlayerId || undefined}
            onMoveToken={handleMoveToken}
            validTokenIndices={isMyTurn && game.turnPhase === 'move' ? game.validTokenIndices : []}
          />

          {/* Interactive 3D Dice */}
          {game.status === 'in_progress' && (
            <div className="flex items-center justify-center p-2">
              <Dice3D
                value={game.lastDiceResult}
                isRolling={isRolling}
                canRoll={canRoll}
                onRoll={handleRollDice}
                accentColor="bg-amber-500"
              />
            </div>
          )}
        </div>

        {/* RIGHT / BOTTOM PLAYER CARDS & CONTROLS (Cols 10-12) */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Remaining 2 player cards */}
          <div className="flex flex-row lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible">
            {game.players.slice(2, 4).map((player) => (
              <div key={player.id} className="flex-1 lg:flex-none min-w-[150px]">
                <PlayerCard
                  player={player}
                  isCurrentTurn={game.currentTurnPlayerId === player.id}
                  isSelf={player.id === myPlayerId}
                />
              </div>
            ))}
          </div>

          {/* Game Controls Box */}
          <GameControls
            game={game}
            myPlayerId={myPlayerId || undefined}
            isHost={isHost}
            onStartGame={handleStartGame}
            onRollDice={handleRollDice}
            isRolling={isRolling}
            canRoll={canRoll}
          />
        </div>
      </main>

      {/* In-Game Chat Drawer */}
      <ChatDrawer
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Victory Celebration Modal */}
      {game.status === 'finished' && (
        <VictoryModal
          game={game}
          onRestart={handleRestartGame}
          onLeave={onNavigateHome}
          myPlayerId={myPlayerId || undefined}
        />
      )}
    </div>
  );
};
