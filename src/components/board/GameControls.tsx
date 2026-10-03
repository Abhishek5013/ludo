import React, { useState } from 'react';
import { GamePlayer, GameState } from '../../types/ludo.js';
import { Check, Copy, Play, Share2, Sparkles } from 'lucide-react';

interface GameControlsProps {
  game: GameState;
  myPlayerId?: string;
  isHost: boolean;
  onStartGame: () => void;
  onRollDice: () => void;
  isRolling: boolean;
  canRoll: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  game,
  myPlayerId,
  isHost,
  onStartGame,
  onRollDice,
  isRolling,
  canRoll,
}) => {
  const [copied, setCopied] = useState(false);

  const currentTurnPlayer = game.players.find((p) => p.id === game.currentTurnPlayerId);
  const isMyTurn = game.currentTurnPlayerId === myPlayerId;
  const isWaiting = game.status === 'waiting';

  const copyRoomLink = () => {
    const url = `${window.location.origin}/game/${game.gameId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-xl flex flex-col gap-3">
      {/* Top Bar: Room Code & Share */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Room Code:</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-sm tracking-widest">
            {game.gameId}
          </span>
        </div>

        <button
          type="button"
          onClick={copyRoomLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer border border-slate-700"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Main Status / Call to Action */}
      {isWaiting ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Waiting for players ({game.players.length}/{game.maxPlayers})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Share the room code or link with friends to join!
            </p>
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={game.players.length < 2}
              onClick={onStartGame}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-lg ${
                game.players.length >= 2
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white cursor-pointer active:scale-95 shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              Start Game
            </button>
          ) : (
            <span className="text-xs text-amber-300/80 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              Waiting for host to start...
            </span>
          )}
        </div>
      ) : game.status === 'in_progress' ? (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/50 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {isMyTurn ? (
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-slate-600" />
            )}
            <div className="min-w-0">
              <span className="text-xs text-slate-400 block">Current Action:</span>
              <p className="text-xs sm:text-sm font-bold truncate">
                {isMyTurn ? (
                  game.turnPhase === 'roll' ? (
                    <span className="text-amber-400 font-extrabold">Your turn to roll!</span>
                  ) : (
                    <span className="text-emerald-400 font-extrabold">
                      Select a pulsing token to move!
                    </span>
                  )
                ) : (
                  <span className="text-slate-200">
                    Waiting for{' '}
                    <strong className="text-amber-300">
                      {currentTurnPlayer?.name || 'opponent'}
                    </strong>
                    ...
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Roll Button if it's my turn to roll */}
          {isMyTurn && game.turnPhase === 'roll' && (
            <button
              type="button"
              disabled={!canRoll || isRolling}
              onClick={onRollDice}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Roll
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30 text-center">
          <h3 className="text-sm font-bold text-emerald-400">Game Finished!</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Winner: <strong>{game.winner?.name}</strong>
          </p>
        </div>
      )}

      {/* Action Ticker / Recent Event */}
      {game.recentActions && game.recentActions.length > 0 && (
        <div className="text-[11px] text-slate-400 bg-slate-950/40 rounded-lg px-2.5 py-1.5 border border-slate-800/60 truncate flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
          <span className="truncate">{game.recentActions[0].text}</span>
        </div>
      )}
    </div>
  );
};
