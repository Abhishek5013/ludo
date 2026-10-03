import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GamePlayer, GameRanking, GameState } from '../../types/ludo.js';
import { sounds } from '../../utils/audio.js';
import { RotateCcw, Trophy, Users } from 'lucide-react';

interface VictoryModalProps {
  game: GameState;
  onRestart: () => void;
  onLeave: () => void;
  myPlayerId?: string;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  game,
  onRestart,
  onLeave,
  myPlayerId,
}) => {
  useEffect(() => {
    sounds.playVictory();
    // Fire festive confetti cannon
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#e11d48', '#059669', '#d97706', '#0284c7', '#fbbf24'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  const winner = game.winner;
  const isWinner = winner?.id === myPlayerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 border-2 border-amber-500/40 shadow-2xl shadow-amber-950/40 text-center flex flex-col items-center">
        {/* Crown & Trophy Header */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-1 flex items-center justify-center shadow-xl shadow-amber-500/20 mb-3 animate-bounce">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-100 font-display">
          {isWinner ? '🎉 YOU WON!' : 'GAME OVER!'}
        </h2>
        <p className="text-sm text-amber-400 font-bold mt-1">
          {winner?.name} takes the crown!
        </p>

        {/* Final Standings Table */}
        <div className="w-full mt-5 bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
          <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2 text-left px-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Final Standings
          </h4>
          <div className="flex flex-col gap-1.5">
            {game.rankings.map((rankEntry) => (
              <div
                key={rankEntry.playerId}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold ${
                  rankEntry.rank === 1
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm">
                    {rankEntry.rank === 1
                      ? '🥇 1st'
                      : rankEntry.rank === 2
                      ? '🥈 2nd'
                      : rankEntry.rank === 3
                      ? '🥉 3rd'
                      : '4th'}
                  </span>
                  <span>{rankEntry.name}</span>
                  {rankEntry.playerId === myPlayerId && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                      (You)
                    </span>
                  )}
                </div>
                <span className="capitalize text-slate-400 font-medium">
                  {rankEntry.color}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full mt-6">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider border border-slate-700 cursor-pointer active:scale-95 transition-all"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};
