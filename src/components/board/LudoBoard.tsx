import React from 'react';
import { GamePlayer, GameState, PlayerColor } from '../../types/ludo.js';
import {
  GridCoord,
  HOME_RUN_COORDINATES,
  SAFE_TRACK_TILES,
  TRACK_COORDINATES,
  getTokenCoordinate,
} from '../../utils/boardCoordinates.js';

interface LudoBoardProps {
  game: GameState;
  myPlayerId?: string;
  onMoveToken: (tokenIndex: number) => void;
  validTokenIndices: number[];
}

const COLOR_CLASSES: Record<
  PlayerColor,
  {
    bg: string;
    lightBg: string;
    border: string;
    tokenBg: string;
    tokenRing: string;
    text: string;
    hex: string;
  }
> = {
  red: {
    bg: 'bg-rose-600',
    lightBg: 'bg-rose-500/20',
    border: 'border-rose-500',
    tokenBg: 'from-rose-500 to-rose-700',
    tokenRing: 'ring-rose-400',
    text: 'text-rose-500',
    hex: '#e11d48',
  },
  green: {
    bg: 'bg-emerald-600',
    lightBg: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    tokenBg: 'from-emerald-500 to-emerald-700',
    tokenRing: 'ring-emerald-400',
    text: 'text-emerald-500',
    hex: '#059669',
  },
  yellow: {
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-500/20',
    border: 'border-amber-500',
    tokenBg: 'from-amber-400 to-amber-600',
    tokenRing: 'ring-amber-400',
    text: 'text-amber-500',
    hex: '#d97706',
  },
  blue: {
    bg: 'bg-sky-600',
    lightBg: 'bg-sky-500/20',
    border: 'border-sky-500',
    tokenBg: 'from-sky-500 to-sky-700',
    tokenRing: 'ring-sky-400',
    text: 'text-sky-500',
    hex: '#0284c7',
  },
};

// Check if a grid coordinate is a special safe star tile or start tile
function getTrackCellDetails(row: number, col: number): {
  isTrack: boolean;
  trackIndex: number;
  isSafe: boolean;
  color?: PlayerColor;
  isStart?: boolean;
} {
  const index = TRACK_COORDINATES.findIndex((c) => c.row === row && c.col === col);
  if (index === -1) return { isTrack: false, trackIndex: -1, isSafe: false };

  const isSafe = SAFE_TRACK_TILES.has(index);
  let color: PlayerColor | undefined;
  let isStart = false;

  if (index === 0) {
    color = 'red';
    isStart = true;
  } else if (index === 13) {
    color = 'green';
    isStart = true;
  } else if (index === 26) {
    color = 'yellow';
    isStart = true;
  } else if (index === 39) {
    color = 'blue';
    isStart = true;
  }

  return { isTrack: true, trackIndex: index, isSafe, color, isStart };
}

// Check if cell is in a player's home run column
function getHomeRunColor(row: number, col: number): PlayerColor | null {
  for (const color of ['red', 'green', 'yellow', 'blue'] as PlayerColor[]) {
    const coords = HOME_RUN_COORDINATES[color];
    if (coords.some((c) => c.row === row && c.col === col)) {
      return color;
    }
  }
  return null;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  game,
  myPlayerId,
  onMoveToken,
  validTokenIndices,
}) => {
  const isMyTurn = game.currentTurnPlayerId === myPlayerId;
  const isMovePhase = game.turnPhase === 'move';
  const myPlayer = game.players.find((p) => p.id === myPlayerId);

  // Group all tokens by their grid coordinate for stacking/offset display
  interface RenderedToken {
    playerId: string;
    playerName: string;
    color: PlayerColor;
    tokenIndex: number;
    step: number;
    coord: GridCoord;
    isMovable: boolean;
  }

  const allTokens: RenderedToken[] = [];
  game.players.forEach((player) => {
    player.tokens.forEach((step, tokenIndex) => {
      const coord = getTokenCoordinate(player.color, tokenIndex, step);
      const isMovable =
        isMyTurn &&
        isMovePhase &&
        player.id === myPlayerId &&
        validTokenIndices.includes(tokenIndex);

      allTokens.push({
        playerId: player.id,
        playerName: player.name,
        color: player.color,
        tokenIndex,
        step,
        coord,
        isMovable,
      });
    });
  });

  // Cell dimensions in percentage (15x15 grid => 100/15 = 6.666%)
  const CELL_PCT = 100 / 15;

  return (
    <div className="relative w-full max-w-[560px] aspect-square mx-auto p-2 sm:p-3 bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-700 select-none">
      {/* Board Outer Frame */}
      <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden shadow-inner border-2 border-slate-800">
        {/* ============================================================== */}
        {/* 1. CORNER YARDS (6x6 cells each = 40% x 40%) */}
        {/* ============================================================== */}

        {/* RED YARD (Top-Left) */}
        <div className="absolute top-0 left-0 w-[40%] h-[40%] bg-rose-600 p-2 sm:p-3 flex items-center justify-center border-r-2 border-b-2 border-slate-800">
          <div className="w-full h-full bg-slate-950/80 rounded-xl p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center shadow-inner">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={`red_yard_${slot}`}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center shadow-inner"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/40" />
              </div>
            ))}
          </div>
        </div>

        {/* GREEN YARD (Top-Right) */}
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-600 p-2 sm:p-3 flex items-center justify-center border-l-2 border-b-2 border-slate-800">
          <div className="w-full h-full bg-slate-950/80 rounded-xl p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center shadow-inner">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={`green_yard_${slot}`}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center shadow-inner"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
              </div>
            ))}
          </div>
        </div>

        {/* BLUE YARD (Bottom-Left) */}
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-sky-600 p-2 sm:p-3 flex items-center justify-center border-r-2 border-t-2 border-slate-800">
          <div className="w-full h-full bg-slate-950/80 rounded-xl p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center shadow-inner">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={`blue_yard_${slot}`}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-sky-950/60 border border-sky-500/40 flex items-center justify-center shadow-inner"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500/40" />
              </div>
            ))}
          </div>
        </div>

        {/* YELLOW YARD (Bottom-Right) */}
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-amber-500 p-2 sm:p-3 flex items-center justify-center border-l-2 border-t-2 border-slate-800">
          <div className="w-full h-full bg-slate-950/80 rounded-xl p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center shadow-inner">
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={`yellow_yard_${slot}`}
                className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center justify-center shadow-inner"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. CENTER HOME VICTORY TRIANGLE (3x3 cells = rows 6..8, cols 6..8) */}
        {/* ============================================================== */}
        <div
          className="absolute z-10 overflow-hidden shadow-2xl border border-slate-800"
          style={{
            top: `${6 * CELL_PCT}%`,
            left: `${6 * CELL_PCT}%`,
            width: `${3 * CELL_PCT}%`,
            height: `${3 * CELL_PCT}%`,
          }}
        >
          {/* SVG 4 Colored Triangles */}
          <svg viewBox="0 0 100 100" className="w-full h-full bg-slate-900">
            {/* Top Green Triangle */}
            <polygon points="0,0 100,0 50,50" fill="#059669" />
            {/* Right Yellow Triangle */}
            <polygon points="100,0 100,100 50,50" fill="#d97706" />
            {/* Bottom Blue Triangle */}
            <polygon points="100,100 0,100 50,50" fill="#0284c7" />
            {/* Left Red Triangle */}
            <polygon points="0,100 0,0 50,50" fill="#e11d48" />
            {/* Center Trophy Disc */}
            <circle cx="50" cy="50" r="14" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs sm:text-sm">👑</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. TRACK & HOME RUN CELLS (15x15 GRID CELLS) */}
        {/* ============================================================== */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((__, c) => {
            // Skip corners (0..5 x 0..5, 0..5 x 9..14, 9..14 x 0..5, 9..14 x 9..14)
            const isCorner =
              (r < 6 && c < 6) ||
              (r < 6 && c > 8) ||
              (r > 8 && c < 6) ||
              (r > 8 && c > 8);

            // Skip center 3x3
            const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

            if (isCorner || isCenter) return null;

            const trackInfo = getTrackCellDetails(r, c);
            const homeRunColor = getHomeRunColor(r, c);

            let cellBg = 'bg-slate-900/90';
            let cellContent: React.ReactNode = null;

            if (homeRunColor) {
              cellBg = COLOR_CLASSES[homeRunColor].bg;
            } else if (trackInfo.isStart && trackInfo.color) {
              cellBg = COLOR_CLASSES[trackInfo.color].bg;
              cellContent = (
                <span className="text-[10px] sm:text-xs font-black text-white/90 drop-shadow">
                  ★
                </span>
              );
            } else if (trackInfo.isSafe) {
              cellBg = 'bg-slate-800';
              cellContent = (
                <span className="text-[10px] sm:text-xs font-bold text-amber-400 drop-shadow">
                  ★
                </span>
              );
            }

            return (
              <div
                key={`cell_${r}_${c}`}
                className={`absolute flex items-center justify-center border-[0.5px] border-slate-700/60 ${cellBg}`}
                style={{
                  top: `${r * CELL_PCT}%`,
                  left: `${c * CELL_PCT}%`,
                  width: `${CELL_PCT}%`,
                  height: `${CELL_PCT}%`,
                }}
              >
                {cellContent}
              </div>
            );
          })
        )}

        {/* ============================================================== */}
        {/* 4. PLAYER TOKENS (Rendered with coordinates and interactions) */}
        {/* ============================================================== */}
        {allTokens.map((token, idx) => {
          const colors = COLOR_CLASSES[token.color];

          // Check if there are multiple tokens on this same coordinate
          const sameCellTokens = allTokens.filter(
            (t) =>
              Math.abs(t.coord.row - token.coord.row) < 0.25 &&
              Math.abs(t.coord.col - token.coord.col) < 0.25
          );

          let offsetX = 0;
          let offsetY = 0;
          if (sameCellTokens.length > 1) {
            const indexInGroup = sameCellTokens.findIndex(
              (t) => t.playerId === token.playerId && t.tokenIndex === token.tokenIndex
            );
            const delta = 6;
            if (indexInGroup === 0) {
              offsetX = -delta;
              offsetY = -delta;
            } else if (indexInGroup === 1) {
              offsetX = delta;
              offsetY = -delta;
            } else if (indexInGroup === 2) {
              offsetX = -delta;
              offsetY = delta;
            } else {
              offsetX = delta;
              offsetY = delta;
            }
          }

          const topPercent = token.coord.row * CELL_PCT;
          const leftPercent = token.coord.col * CELL_PCT;

          return (
            <div
              key={`token_${token.playerId}_${token.tokenIndex}`}
              className="absolute z-20 flex items-center justify-center transition-all duration-300 ease-out"
              style={{
                top: `${topPercent}%`,
                left: `${leftPercent}%`,
                width: `${CELL_PCT}%`,
                height: `${CELL_PCT}%`,
                transform: `translate(${offsetX}px, ${offsetY}px)`,
              }}
            >
              <button
                type="button"
                disabled={!token.isMovable}
                onClick={() => {
                  if (token.isMovable) {
                    onMoveToken(token.tokenIndex);
                  }
                }}
                aria-label={`Token ${token.tokenIndex + 1} of ${token.playerName}`}
                className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-b ${
                  colors.tokenBg
                } text-white font-extrabold text-[10px] sm:text-xs flex items-center justify-center shadow-lg border-2 border-white/90 focus:outline-none transition-transform duration-200 ${
                  token.isMovable
                    ? 'cursor-pointer scale-125 z-30 ring-4 ring-amber-400 ring-offset-1 ring-offset-slate-950 animate-bounce'
                    : 'cursor-default'
                }`}
              >
                {/* Inner shine */}
                <div className="absolute top-0.5 left-1 w-2 h-1 bg-white/70 rounded-full pointer-events-none" />
                <span className="drop-shadow-md">{token.tokenIndex + 1}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
