import React, { useState, useEffect } from 'react';
import { sounds } from '../../utils/audio.js';

interface Dice3DProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  accentColor?: string;
  forcedIndicator?: number | null;
}

export const Dice3D: React.FC<Dice3DProps> = ({
  value,
  isRolling,
  canRoll,
  onRoll,
  accentColor = 'bg-amber-500',
  forcedIndicator,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value || 1);
  const [rollDegree, setRollDegree] = useState<number>(0);

  useEffect(() => {
    if (value) {
      setDisplayValue(value);
    }
  }, [value]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRolling) {
      sounds.playDiceRoll();
      interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
        setRollDegree((prev) => prev + 90);
      }, 70);
    } else if (value) {
      setDisplayValue(value);
      sounds.playDiceResult();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRolling, value]);

  const renderDots = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <span className="w-5 h-5 rounded-full bg-red-600 shadow-inner" />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-start" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-start" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-center" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-full p-2 place-items-center">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-2">
            <div className="grid grid-cols-2 grid-rows-2 gap-3 w-full h-full place-items-center">
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
              <span className="w-3.5 h-3.5 rounded-full bg-slate-900" />
            </div>
            <span className="w-3.5 h-3.5 rounded-full bg-slate-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-x-3 gap-y-1 w-full h-full p-2 place-items-center">
            <span className="w-3 h-3 rounded-full bg-slate-900" />
            <span className="w-3 h-3 rounded-full bg-slate-900" />
            <span className="w-3 h-3 rounded-full bg-slate-900" />
            <span className="w-3 h-3 rounded-full bg-slate-900" />
            <span className="w-3 h-3 rounded-full bg-slate-900" />
            <span className="w-3 h-3 rounded-full bg-slate-900" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        disabled={!canRoll || isRolling}
        onClick={onRoll}
        aria-label="Roll dice"
        className={`relative group focus:outline-none transition-transform duration-200 ${
          canRoll && !isRolling
            ? 'cursor-pointer hover:scale-105 active:scale-95'
            : 'opacity-80 cursor-not-allowed'
        }`}
      >
        {/* Glow Ring when it is your turn to roll */}
        {canRoll && !isRolling && (
          <div className="absolute -inset-2 rounded-2xl bg-amber-400/40 blur-md animate-pulse pointer-events-none" />
        )}

        {/* 3D Dice Face Container */}
        <div
          className={`w-18 h-18 sm:w-20 sm:h-20 bg-gradient-to-br from-white via-slate-100 to-slate-200 rounded-2xl shadow-xl border-2 border-slate-300/80 flex items-center justify-center transform transition-all duration-300 relative ${
            isRolling ? 'rotate-12 scale-110 shadow-2xl' : 'shadow-lg'
          }`}
          style={{
            transform: isRolling
              ? `rotate(${rollDegree}deg) scale(1.08)`
              : 'rotate(0deg) scale(1)',
          }}
        >
          {renderDots(displayValue)}

          {/* Shine reflection */}
          <div className="absolute top-1 left-1.5 w-6 h-3 bg-white/70 rounded-full blur-[1px] transform -rotate-12 pointer-events-none" />
        </div>
      </button>

      {/* Roll Status / Prompt */}
      <div className="mt-2 text-center">
        {canRoll && !isRolling ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            TAP TO ROLL
          </span>
        ) : isRolling ? (
          <span className="text-xs font-medium text-slate-400 animate-bounce">
            Rolling...
          </span>
        ) : (
          <span className="text-xs text-slate-500 font-medium">
            {value ? `Rolled ${value}` : 'Waiting...'}
          </span>
        )}
      </div>
    </div>
  );
};
