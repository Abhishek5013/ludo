import assert from 'assert';
import { GameStore } from '../src/server/services/gameStore.js';
import {
  COLOR_START_INDEX,
  executeTokenMove,
  getGlobalTrackIndex,
  getValidMoves,
  isSafeCell,
  rollAuthoritativeDice,
  SAFE_TRACK_TILES,
} from '../src/server/services/ludoEngine.js';
import { GamePlayer, GameState } from '../src/types/ludo.js';

console.log('🧪 Starting Ludo Game Logic & Rule System Tests...\n');

let testsPassed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Dice Generation: Random when no forced result
test('Random dice generation returns 1..6 when no forced dice set', () => {
  const player: GamePlayer = {
    id: 'p1',
    name: 'Player 1',
    color: 'red',
    tokens: [0, 0, 0, 0],
    connected: true,
    forcedNextDice: null,
    socketId: null,
    isHost: true,
    rank: null,
  };

  const results = new Set<number>();
  for (let i = 0; i < 200; i++) {
    const { diceResult, wasForced } = rollAuthoritativeDice(player);
    assert.strictEqual(wasForced, false);
    assert(diceResult >= 1 && diceResult <= 6, `Dice result ${diceResult} out of range`);
    results.add(diceResult);
  }
  // Across 200 rolls, all numbers 1..6 should appear
  assert.strictEqual(results.size, 6, 'All dice faces 1..6 should be reachable');
});

// 2. Forced dice is returned and consumed after one roll
test('Forced dice is returned and immediately consumed after one roll', () => {
  const player: GamePlayer = {
    id: 'p1',
    name: 'Player 1',
    color: 'red',
    tokens: [0, 0, 0, 0],
    connected: true,
    forcedNextDice: 6,
    socketId: null,
    isHost: true,
    rank: null,
  };

  const firstRoll = rollAuthoritativeDice(player);
  assert.strictEqual(firstRoll.diceResult, 6, 'First roll must equal forced value 6');
  assert.strictEqual(firstRoll.wasForced, true, 'First roll wasForced must be true');
  assert.strictEqual(player.forcedNextDice, null, 'player.forcedNextDice must be reset to null after roll');

  // Next roll should now be random (not forced)
  const secondRoll = rollAuthoritativeDice(player);
  assert.strictEqual(secondRoll.wasForced, false, 'Second roll wasForced must be false');
  assert(secondRoll.diceResult >= 1 && secondRoll.diceResult <= 6);
});

// 3. Player-Specific forced dice independence test (Section 27 critical requirement)
test('Player A forced dice 6 and Player B forced dice 2: independent and non-affecting', () => {
  const playerA: GamePlayer = {
    id: 'pA',
    name: 'Player A',
    color: 'red',
    tokens: [0, 0, 0, 0],
    connected: true,
    forcedNextDice: 6,
    socketId: null,
    isHost: true,
    rank: null,
  };

  const playerB: GamePlayer = {
    id: 'pB',
    name: 'Player B',
    color: 'green',
    tokens: [0, 0, 0, 0],
    connected: true,
    forcedNextDice: 2,
    socketId: null,
    isHost: false,
    rank: null,
  };

  // Player A rolls
  const rollA = rollAuthoritativeDice(playerA);
  assert.strictEqual(rollA.diceResult, 6, 'Player A must roll forced 6');
  assert.strictEqual(rollA.wasForced, true);
  assert.strictEqual(playerA.forcedNextDice, null, 'Player A forced dice consumed');

  // Player B's forced dice must be untouched!
  assert.strictEqual(playerB.forcedNextDice, 2, 'Player B forced dice must remain 2 after A rolled');

  // Player B rolls
  const rollB = rollAuthoritativeDice(playerB);
  assert.strictEqual(rollB.diceResult, 2, 'Player B must roll forced 2');
  assert.strictEqual(rollB.wasForced, true);
  assert.strictEqual(playerB.forcedNextDice, null, 'Player B forced dice consumed');

  // Both should now be random
  const rollA2 = rollAuthoritativeDice(playerA);
  const rollB2 = rollAuthoritativeDice(playerB);
  assert.strictEqual(rollA2.wasForced, false, 'Player A subsequent roll is random');
  assert.strictEqual(rollB2.wasForced, false, 'Player B subsequent roll is random');
});

// 4. Token entering and valid moves
test('Valid moves: Token in yard only moves with roll of 6', () => {
  const player: GamePlayer = {
    id: 'p1',
    name: 'Player 1',
    color: 'red',
    tokens: [0, 0, 0, 0],
    connected: true,
    forcedNextDice: null,
    socketId: null,
    isHost: true,
    rank: null,
  };

  assert.deepStrictEqual(getValidMoves(player, 1), []);
  assert.deepStrictEqual(getValidMoves(player, 2), []);
  assert.deepStrictEqual(getValidMoves(player, 3), []);
  assert.deepStrictEqual(getValidMoves(player, 4), []);
  assert.deepStrictEqual(getValidMoves(player, 5), []);
  assert.deepStrictEqual(getValidMoves(player, 6), [0, 1, 2, 3]);
});

// 5. Token moving on board & exact home roll requirement
test('Valid moves: Token on track advances, cannot overshoot step 57', () => {
  const player: GamePlayer = {
    id: 'p1',
    name: 'Player 1',
    color: 'red',
    tokens: [55, 0, 57, 10], // token 0 at 55 (needs 2 for home), token 1 at yard, token 2 finished, token 3 at 10
    connected: true,
    forcedNextDice: null,
    socketId: null,
    isHost: true,
    rank: null,
  };

  // Roll 3: token 0 (55 + 3 = 58 > 57) cannot move! token 1 (yard) cannot move. token 2 (finished) cannot move. token 3 (10 + 3 = 13) CAN move!
  assert.deepStrictEqual(getValidMoves(player, 3), [3]);

  // Roll 2: token 0 (55 + 2 = 57) CAN move to home! token 3 can move.
  assert.deepStrictEqual(getValidMoves(player, 2), [0, 3]);

  // Roll 6: token 1 (yard) can enter (step 1), token 3 can move (10 + 6 = 16)
  assert.deepStrictEqual(getValidMoves(player, 6), [1, 3]);
});

// 6. Safe Cells: Starting tiles and Star tiles are safe
test('Safe cells: Starting positions and star positions are recognized as safe', () => {
  // Red start: step 1 -> track index 0
  assert.strictEqual(isSafeCell('red', 1), true);
  // Red step 0 (yard) and step 52..57 are safe
  assert.strictEqual(isSafeCell('red', 0), true);
  assert.strictEqual(isSafeCell('red', 52), true);
  assert.strictEqual(isSafeCell('red', 57), true);

  // Red step 2 -> track index 1 (not safe)
  assert.strictEqual(isSafeCell('red', 2), false);

  // Red step 9 -> track index 8 (star safe tile)
  assert.strictEqual(isSafeCell('red', 9), true);
});

// 7. Token Capture Mechanics
test('Capture: Landing on opponent token in non-safe cell sends opponent back to yard and gives bonus turn', () => {
  const store = new GameStore();
  const { game, hostPlayer } = store.createGame('Alice', 2, 'red');
  const joinResult = store.joinGame(game.gameId, 'Bob', 'green');
  const bobPlayer = joinResult.player!;

  store.startGame(game.gameId, hostPlayer.id);

  // Manually place Alice at step 13 (track tile 12)
  hostPlayer.tokens[0] = 13;
  // Place Bob at step 1 (Green starting tile: track tile 13)
  // Alice track index for step 13: (0 + 13 - 1) = 12
  // If Alice rolls 1: advances to step 14 -> track tile 13 (Bob's starting tile, which is SAFE!)
  // Instead, let's put Bob at track tile 14 (Green step 2)
  bobPlayer.tokens[0] = 2; // Green track index: (13 + 2 - 1) = 14 (NOT SAFE!)

  // Set Alice at step 14 (Red track index: 0 + 14 - 1 = 13)
  hostPlayer.tokens[0] = 14;

  // Alice rolls 1: step 14 -> 15. Track index: 0 + 15 - 1 = 14! Lands on Bob's token!
  game.currentTurnPlayerId = hostPlayer.id;
  game.currentTurnColor = hostPlayer.color;
  game.turnPhase = 'roll';
  hostPlayer.forcedNextDice = 1;

  const rollRes = store.rollDice(game.gameId, hostPlayer.id);
  assert.strictEqual(rollRes.diceResult, 1);

  const moveRes = store.moveToken(game.gameId, hostPlayer.id, 0);
  assert.strictEqual(moveRes.success, true);
  assert(moveRes.captured !== undefined, 'Capture must occur');
  assert.strictEqual(moveRes.captured?.playerId, bobPlayer.id);
  assert.strictEqual(bobPlayer.tokens[0], 0, 'Bob token must be sent back to yard (step 0)');
  assert.strictEqual(moveRes.bonusRoll, true, 'Alice must receive bonus roll after capture');
  assert.strictEqual(game.currentTurnPlayerId, hostPlayer.id, 'Alice retains turn after capture');
});

// 8. Winning Detection
test('Winning: When all 4 tokens reach home (step 57), player wins and rank is recorded', () => {
  const store = new GameStore();
  const { game, hostPlayer } = store.createGame('Charlie', 2, 'red');
  const joinResult = store.joinGame(game.gameId, 'Dave', 'green');
  store.startGame(game.gameId, hostPlayer.id);

  // Put 3 tokens already at 57, and 4th token at 56
  hostPlayer.tokens = [57, 57, 57, 56];
  game.currentTurnPlayerId = hostPlayer.id;
  game.turnPhase = 'roll';
  hostPlayer.forcedNextDice = 1;

  store.rollDice(game.gameId, hostPlayer.id);
  const moveRes = store.moveToken(game.gameId, hostPlayer.id, 3);

  assert.strictEqual(moveRes.success, true);
  assert.strictEqual(hostPlayer.tokens[3], 57, 'Token must be in home (57)');
  assert.strictEqual(hostPlayer.rank, 1, 'Charlie must be awarded 1st rank');
  assert.strictEqual(game.winner?.id, hostPlayer.id, 'Charlie must be winner');
  assert.strictEqual(game.status, 'finished', '2-player game ends when 1st player finishes');
});

// 9. Turn changes correctly on normal roll without bonus
test('Turn changes to next player when rolling non-6 without capture or home', () => {
  const store = new GameStore();
  const { game, hostPlayer } = store.createGame('Eve', 2, 'red');
  const joinResult = store.joinGame(game.gameId, 'Frank', 'green');
  const frank = joinResult.player!;
  store.startGame(game.gameId, hostPlayer.id);

  // Eve has token on board at step 10
  hostPlayer.tokens[0] = 10;
  hostPlayer.forcedNextDice = 3;

  store.rollDice(game.gameId, hostPlayer.id);
  const moveRes = store.moveToken(game.gameId, hostPlayer.id, 0);

  assert.strictEqual(moveRes.success, true);
  assert.strictEqual(moveRes.bonusRoll, false);
  assert.strictEqual(game.currentTurnPlayerId, frank.id, 'Turn must pass to Frank');
  assert.strictEqual(game.turnPhase, 'roll');
});

// 10. Game Full Condition
test('Room full condition prevents more players than maxPlayers', () => {
  const store = new GameStore();
  const { game } = store.createGame('Host', 2, 'red');
  const join1 = store.joinGame(game.gameId, 'P2', 'green');
  assert.strictEqual(join1.success, true);

  const join2 = store.joinGame(game.gameId, 'P3', 'yellow');
  assert.strictEqual(join2.success, false);
  assert(join2.error?.includes('full'));
});

// 11. MongoDB URI Sanitization (handles user angle brackets <user>:<pass> and unescaped special characters like @)
test('cleanMongoUri handles angle brackets and URL-encodes special characters', async () => {
  const { cleanMongoUri } = await import('../src/server/utils/mongoUri.js');
  const rawWithBracketsAndAt = 'mongodb+srv://<ludouser>:<Abhi@0508>@cluster0.3vnr9w1.mongodb.net/?appName=Cluster0';
  const cleaned = cleanMongoUri(rawWithBracketsAndAt);
  assert.strictEqual(
    cleaned,
    'mongodb+srv://ludouser:Abhi%400508@cluster0.3vnr9w1.mongodb.net/?appName=Cluster0',
    'Angle brackets must be removed and @ in password properly URL-encoded'
  );

  assert.strictEqual(cleanMongoUri(undefined), null);
  assert.strictEqual(cleanMongoUri(''), null);
});

console.log(`\n🎉 All ${testsPassed} Ludo Rule System tests PASSED successfully!\n`);
