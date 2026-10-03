import { GamePlayer, GameState, PlayerColor, TurnPhase } from '../../types/ludo.js';

export const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const COLOR_START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Safe tiles on the 52-tile track
export const SAFE_TRACK_TILES = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

/**
 * Returns the global track index (0..51) for a token at a given step (1..51).
 * Returns -1 if token is in yard (0), in home column (52..56), or finished (57).
 */
export function getGlobalTrackIndex(color: PlayerColor, step: number): number {
  if (step < 1 || step > 51) return -1;
  const start = COLOR_START_INDEX[color];
  return (start + (step - 1)) % 52;
}

/**
 * Checks if a token at a given step is on a safe cell.
 */
export function isSafeCell(color: PlayerColor, step: number): boolean {
  if (step === 0 || step >= 52) return true; // Yard, home run, and home are safe
  const globalIdx = getGlobalTrackIndex(color, step);
  return SAFE_TRACK_TILES.has(globalIdx);
}

/**
 * Determines which token indices (0..3) can be moved by the given player with the rolled dice.
 */
export function getValidMoves(player: GamePlayer, dice: number): number[] {
  const valid: number[] = [];
  player.tokens.forEach((step, index) => {
    if (step === 57) {
      // Already finished
      return;
    }
    if (step === 0) {
      // In yard: only roll of 6 can enter the board
      if (dice === 6) {
        valid.push(index);
      }
      return;
    }
    // Token on board: can advance if new step does not overshoot 57
    if (step + dice <= 57) {
      valid.push(index);
    }
  });
  return valid;
}

/**
 * Rolls dice server-side for the given player.
 * Checks for admin-forced dice result first. If set, consumes it!
 * Otherwise returns a random integer 1..6.
 */
export function rollAuthoritativeDice(player: GamePlayer): {
  diceResult: number;
  wasForced: boolean;
} {
  if (
    player.forcedNextDice !== null &&
    player.forcedNextDice !== undefined &&
    player.forcedNextDice >= 1 &&
    player.forcedNextDice <= 6
  ) {
    const forced = player.forcedNextDice;
    // Section 9 & 10: "After that roll, automatically remove the forced result.
    // Therefore the following roll becomes random unless the admin sets another value."
    player.forcedNextDice = null;
    return { diceResult: forced, wasForced: true };
  }

  const randomResult = Math.floor(Math.random() * 6) + 1;
  return { diceResult: randomResult, wasForced: false };
}

/**
 * Finds the next player whose turn it is.
 */
export function getNextPlayer(
  game: GameState,
  currentPlayerId: string
): GamePlayer | null {
  const activeUnfinishedPlayers = game.players.filter(
    (p) => p.rank === null
  );

  if (activeUnfinishedPlayers.length <= 1) {
    return null;
  }

  const currentIndex = game.players.findIndex((p) => p.id === currentPlayerId);
  const total = game.players.length;

  for (let i = 1; i <= total; i++) {
    const nextIdx = (currentIndex + i) % total;
    const candidate = game.players[nextIdx];
    if (candidate && candidate.rank === null) {
      return candidate;
    }
  }

  return activeUnfinishedPlayers[0] || null;
}

/**
 * Applies a token move on the game state.
 * Validates, moves token, handles captures, checks for bonus rolls,
 * checks win conditions, and updates current turn.
 */
export function executeTokenMove(
  game: GameState,
  playerId: string,
  tokenIndex: number
): {
  success: boolean;
  error?: string;
  captured?: { playerId: string; tokenIndex: number; color: PlayerColor };
  bonusRoll: boolean;
  gameEnded: boolean;
  reachedHome: boolean;
} {
  if (game.status !== 'in_progress') {
    return { success: false, error: 'Game is not in progress', bonusRoll: false, gameEnded: false, reachedHome: false };
  }

  if (game.currentTurnPlayerId !== playerId) {
    return { success: false, error: 'Not your turn', bonusRoll: false, gameEnded: false, reachedHome: false };
  }

  if (game.turnPhase !== 'move') {
    return { success: false, error: 'Must roll dice before moving', bonusRoll: false, gameEnded: false, reachedHome: false };
  }

  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: 'Player not found in game', bonusRoll: false, gameEnded: false, reachedHome: false };
  }

  if (!game.validTokenIndices.includes(tokenIndex)) {
    return { success: false, error: 'Invalid move for this token', bonusRoll: false, gameEnded: false, reachedHome: false };
  }

  const dice = game.lastDiceResult;
  if (!dice) {
    return { success: false, error: 'No active dice roll found', bonusRoll: false, gameEnded: false, reachedHome: false };
  }

  const currentStep = player.tokens[tokenIndex];
  let newStep = currentStep;

  if (currentStep === 0) {
    if (dice !== 6) {
      return { success: false, error: 'Must roll a 6 to enter board', bonusRoll: false, gameEnded: false, reachedHome: false };
    }
    newStep = 1;
  } else {
    newStep = currentStep + dice;
    if (newStep > 57) {
      return { success: false, error: 'Move exceeds home goal', bonusRoll: false, gameEnded: false, reachedHome: false };
    }
  }

  // Update token step
  player.tokens[tokenIndex] = newStep;

  let captured: { playerId: string; tokenIndex: number; color: PlayerColor } | undefined;
  let bonusRoll = false;
  let reachedHome = false;

  // Check capture on main track (1..51)
  if (newStep >= 1 && newStep <= 51) {
    const landingGlobalIdx = getGlobalTrackIndex(player.color, newStep);
    const isSafe = SAFE_TRACK_TILES.has(landingGlobalIdx);

    if (!isSafe) {
      // Check other players' tokens
      for (const opponent of game.players) {
        if (opponent.id === player.id) continue;

        opponent.tokens.forEach((opStep, opIdx) => {
          if (opStep >= 1 && opStep <= 51) {
            const opGlobalIdx = getGlobalTrackIndex(opponent.color, opStep);
            if (opGlobalIdx === landingGlobalIdx) {
              // Capture! Send opponent token back to yard (step 0)
              opponent.tokens[opIdx] = 0;
              captured = {
                playerId: opponent.id,
                tokenIndex: opIdx,
                color: opponent.color,
              };
              bonusRoll = true;
            }
          }
        });
      }
    }
  }

  // Check if token reached home (57)
  if (newStep === 57) {
    reachedHome = true;
    bonusRoll = true; // Reaching home gives bonus roll

    // Check if player won / finished all 4 tokens
    const allHome = player.tokens.every((s) => s === 57);
    if (allHome && player.rank === null) {
      const nextRank = game.rankings.length + 1;
      player.rank = nextRank;
      game.rankings.push({
        playerId: player.id,
        name: player.name,
        color: player.color,
        rank: nextRank,
      });

      if (!game.winner) {
        game.winner = player;
      }
    }
  }

  // Check if player rolled a 6 (grants bonus roll unless 3 consecutive sixes)
  if (dice === 6 && !bonusRoll) {
    bonusRoll = true;
  }

  // Check if game is finished (all or all-but-one players have finished)
  const remainingPlayers = game.players.filter((p) => p.rank === null);
  let gameEnded = false;
  if (remainingPlayers.length <= 1) {
    gameEnded = true;
    game.status = 'finished';
    // If one player remains unfinished, give them the final rank
    if (remainingPlayers.length === 1 && game.players.length > 1) {
      const lastPlayer = remainingPlayers[0];
      lastPlayer.rank = game.rankings.length + 1;
      game.rankings.push({
        playerId: lastPlayer.id,
        name: lastPlayer.name,
        color: lastPlayer.color,
        rank: lastPlayer.rank,
      });
    }
  }

  // Handle turn transition
  game.validTokenIndices = [];

  if (gameEnded) {
    game.turnPhase = 'roll';
  } else if (bonusRoll && player.rank === null) {
    // Current player gets another roll!
    game.turnPhase = 'roll';
    // consecutiveSixes is already incremented in roll authoritatively
  } else {
    // Turn passes to next player
    game.consecutiveSixes = 0;
    const nextPlayer = getNextPlayer(game, player.id);
    if (nextPlayer) {
      game.currentTurnPlayerId = nextPlayer.id;
      game.currentTurnColor = nextPlayer.color;
      game.turnPhase = 'roll';
    }
  }

  game.updatedAt = Date.now();

  return {
    success: true,
    captured,
    bonusRoll,
    gameEnded,
    reachedHome,
  };
}
