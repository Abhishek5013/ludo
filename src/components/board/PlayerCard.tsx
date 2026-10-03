import React from 'react';
import { GamePlayer, PlayerColor } from '../../types/ludo.js';
import { Crown, Wifi, WifiOff } from 'lucide-react';

interface PlayerCardProps {
  player: GamePlayer;
  isCurrentTurn: boolean;
  isSelf: boolean;
}

const COLOR_CONFIG: Record<
  PlayerColor,
  {
    border: string;
    activeBorder: string;
    glow: string;
    badge: string;
    dot: string;
    label: string;
  }
> = {
  red: {
    border: 'border-rose-900/60 bg-rose-950/20',
    activeBorder: 'border-rose-500 bg-rose-950/40 shadow-rose-900/30',
    glow: 'ring-rose-500',
    badge: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
    label: 'Red',
  },
  green: {
    border: 'border-emerald-900/60 bg-emerald-950/20',
    activeBorder: 'border-emerald-500 bg-emerald-950/40 shadow-emerald-900/30',
    glow: 'ring-emerald-500',
    badge: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
    label: 'Green',
  },
  yellow: {
    border: 'border-amber-900/60 bg-amber-950/20',
    activeBorder: 'border-amber-500 bg-amber-950/40 shadow-amber-900/30',
    glow: 'ring-amber-500',
    badge: 'bg-amber-500 text-slate-950 font-bold',
    dot: 'bg-amber-400',
    label: 'Yellow',
  },
  blue: {
    border: 'border-sky-900/60 bg-sky-950/20',
    activeBorder: 'border-sky-500 bg-sky-950/40 shadow-sky-900/30',
    glow: 'ring-sky-500',
    badge: 'bg-sky-500 text-white',
    dot: 'bg-sky-500',
    label: 'Blue',
  },
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  isSelf,
}) => {
  const config = COLOR_CONFIG[player.color];

  // Token breakdown
  const yardCount = player.tokens.filter((s) => s === 0).length;
  const homeCount = player.tokens.filter((s) => s === 57).length;
  const boardCount = 4 - yardCount - homeCount;

  return (
    <div
      className={`relative rounded-2xl p-2.5 sm:p-3 border transition-all duration-300 backdrop-blur-md ${
        isCurrentTurn
          ? `${config.activeBorder} shadow-lg ring-2 ${config.glow}`
          : `${config.border} opacity-85`
      }`}
    >
      {/* Active turn badge */}
      {isCurrentTurn && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-md flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
          Turn
        </div>
      )}

      {/* Finished Rank Badge */}
      {player.rank !== null && (
        <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 shadow-md">
          {player.rank === 1
            ? '🥇 1st'
            : player.rank === 2
            ? '🥈 2nd'
            : player.rank === 3
            ? '🥉 3rd'
            : '4th'}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {/* Name & Color Dot */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <span className={`block w-4 h-4 rounded-full ${config.dot} shadow-md`} />
            {player.isHost && (
              <Crown className="w-3 h-3 text-amber-400 absolute -top-1.5 -right-1.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                {player.name}
              </span>
              {isSelf && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  You
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 capitalize">
              {config.label}
            </span>
          </div>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center gap-1">
          {player.connected ? (
            <span title="Connected">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </span>
          ) : (
            <span title="Disconnected">
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            </span>
          )}
        </div>
      </div>

      {/* Token Progress Bar */}
      <div className="mt-2.5 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div className="bg-slate-900/60 rounded-lg py-1 px-1 border border-slate-800/80">
          <span className="text-slate-400 block text-[9px]">Yard</span>
          <span className="font-bold text-slate-200">{yardCount}</span>
        </div>
        <div className="bg-slate-900/60 rounded-lg py-1 px-1 border border-slate-800/80">
          <span className="text-slate-400 block text-[9px]">Track</span>
          <span className="font-bold text-slate-200">{boardCount}</span>
        </div>
        <div className="bg-slate-900/60 rounded-lg py-1 px-1 border border-slate-800/80">
          <span className="text-slate-400 block text-[9px]">Home</span>
          <span className="font-bold text-emerald-400">{homeCount}/4</span>
        </div>
      </div>
    </div>
  );
};
