import { COLOR_START_INDEX } from '../server/services/ludoEngine.js';
import { PlayerColor } from '../types/ludo.js';

export interface GridCoord {
  row: number;
  col: number;
}

// Safe tiles on the 52-tile track (start tiles: 0, 13, 26, 39; star tiles: 8, 21, 34, 47)
export const SAFE_TRACK_TILES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

// 52 clockwise perimeter cells
export const TRACK_COORDINATES: GridCoord[] = [
  /* 0  (Red Start) */ { row: 6, col: 1 },
  /* 1              */ { row: 6, col: 2 },
  /* 2              */ { row: 6, col: 3 },
  /* 3              */ { row: 6, col: 4 },
  /* 4              */ { row: 6, col: 5 },
  /* 5              */ { row: 5, col: 6 },
  /* 6              */ { row: 4, col: 6 },
  /* 7              */ { row: 3, col: 6 },
  /* 8  (Safe Star) */ { row: 2, col: 6 },
  /* 9              */ { row: 1, col: 6 },
  /* 10             */ { row: 0, col: 6 },
  /* 11             */ { row: 0, col: 7 },
  /* 12             */ { row: 0, col: 8 },
  /* 13 (Green St.) */ { row: 1, col: 8 },
  /* 14             */ { row: 2, col: 8 },
  /* 15             */ { row: 3, col: 8 },
  /* 16             */ { row: 4, col: 8 },
  /* 17             */ { row: 5, col: 8 },
  /* 18             */ { row: 6, col: 9 },
  /* 19             */ { row: 6, col: 10 },
  /* 20             */ { row: 6, col: 11 },
  /* 21 (Safe Star) */ { row: 6, col: 12 },
  /* 22             */ { row: 6, col: 13 },
  /* 23             */ { row: 6, col: 14 },
  /* 24             */ { row: 7, col: 14 },
  /* 25             */ { row: 8, col: 14 },
  /* 26 (Yellow St) */ { row: 8, col: 13 },
  /* 27             */ { row: 8, col: 12 },
  /* 28             */ { row: 8, col: 11 },
  /* 29             */ { row: 8, col: 10 },
  /* 30             */ { row: 8, col: 9 },
  /* 31             */ { row: 9, col: 8 },
  /* 32             */ { row: 10, col: 8 },
  /* 33             */ { row: 11, col: 8 },
  /* 34 (Safe Star) */ { row: 12, col: 8 },
  /* 35             */ { row: 13, col: 8 },
  /* 36             */ { row: 14, col: 8 },
  /* 37             */ { row: 14, col: 7 },
  /* 38             */ { row: 14, col: 6 },
  /* 39 (Blue St.)  */ { row: 13, col: 6 },
  /* 40             */ { row: 12, col: 6 },
  /* 41             */ { row: 11, col: 6 },
  /* 42             */ { row: 10, col: 6 },
  /* 43             */ { row: 9, col: 6 },
  /* 44             */ { row: 8, col: 5 },
  /* 45             */ { row: 8, col: 4 },
  /* 46             */ { row: 8, col: 3 },
  /* 47 (Safe Star) */ { row: 8, col: 2 },
  /* 48             */ { row: 8, col: 1 },
  /* 49             */ { row: 8, col: 0 },
  /* 50             */ { row: 7, col: 0 },
  /* 51             */ { row: 6, col: 0 },
];

export const HOME_RUN_COORDINATES: Record<PlayerColor, GridCoord[]> = {
  red: [
    { row: 7, col: 1 },
    { row: 7, col: 2 },
    { row: 7, col: 3 },
    { row: 7, col: 4 },
    { row: 7, col: 5 },
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

// Home victory triangle coordinates per color
export const HOME_FINAL_COORDINATES: Record<PlayerColor, GridCoord> = {
  red: { row: 7, col: 6.4 },
  green: { row: 6.4, col: 7 },
  yellow: { row: 7, col: 7.6 },
  blue: { row: 7.6, col: 7 },
};

// Yard resting slot positions (4 per color)
export const YARD_COORDINATES: Record<PlayerColor, GridCoord[]> = {
  red: [
    { row: 1.8, col: 1.8 },
    { row: 1.8, col: 3.2 },
    { row: 3.2, col: 1.8 },
    { row: 3.2, col: 3.2 },
  ],
  green: [
    { row: 1.8, col: 10.8 },
    { row: 1.8, col: 12.2 },
    { row: 3.2, col: 10.8 },
    { row: 3.2, col: 12.2 },
  ],
  yellow: [
    { row: 10.8, col: 10.8 },
    { row: 10.8, col: 12.2 },
    { row: 12.2, col: 10.8 },
    { row: 12.2, col: 12.2 },
  ],
  blue: [
    { row: 10.8, col: 1.8 },
    { row: 10.8, col: 3.2 },
    { row: 12.2, col: 1.8 },
    { row: 12.2, col: 3.2 },
  ],
};

/**
 * Calculates row and col for a given token step (0..57)
 */
export function getTokenCoordinate(
  color: PlayerColor,
  tokenIndex: number,
  step: number
): GridCoord {
  if (step === 0) {
    return YARD_COORDINATES[color][tokenIndex];
  }
  if (step >= 1 && step <= 51) {
    const trackIdx = (COLOR_START_INDEX[color] + (step - 1)) % 52;
    return TRACK_COORDINATES[trackIdx];
  }
  if (step >= 52 && step <= 56) {
    const homeIdx = step - 52;
    return HOME_RUN_COORDINATES[color][homeIdx];
  }
  // Step 57: Finished Home
  const base = HOME_FINAL_COORDINATES[color];
  // Slightly cluster tokens in home triangle
  const offsets = [
    { row: -0.15, col: -0.15 },
    { row: -0.15, col: 0.15 },
    { row: 0.15, col: -0.15 },
    { row: 0.15, col: 0.15 },
  ];
  const off = offsets[tokenIndex % 4];
  return { row: base.row + off.row, col: base.col + off.col };
}
