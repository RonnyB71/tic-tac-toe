import prisma from '../lib/prisma';
import redis from '../lib/redis';
import {
  startTestServer,
  cleanDb,
  registerUser,
  connectClient,
  waitFor,
  matchTwoPlayers,
  makeMove,
} from './helpers';
import type { Agent } from 'supertest';

let url: string;
let api: Agent;
let closeServer: () => Promise<void>;
let counter = 0;

beforeAll(async () => {
  await cleanDb();
  const server = await startTestServer();
  url = server.url;
  api = server.api;
  closeServer = server.close;
});

afterAll(async () => {
  await closeServer();
  await cleanDb();
});

/** Register a fresh pair of users for each test to avoid state collisions */
async function freshPair() {
  counter++;
  const u1 = await registerUser(api, `guser${counter}a`);
  const u2 = await registerUser(api, `guser${counter}b`);
  return [u1.token, u2.token] as [string, string];
}

// ─── Matchmaking ────────────────────────────────────────────────────────────

describe('matchmaking', () => {
  it('assigns one player X and the other O', async () => {
    const tokens = await freshPair();
    const { p1Symbol, p2Symbol, p1, p2 } = await matchTwoPlayers(url, tokens);

    const symbols = [p1Symbol, p2Symbol];
    expect(symbols).toContain('X');
    expect(symbols).toContain('O');
    expect(p1Symbol).not.toBe(p2Symbol);

    p1.disconnect();
    p2.disconnect();
  });

  it('both players receive the same roomId', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId } = await matchTwoPlayers(url, tokens);

    expect(typeof roomId).toBe('string');
    expect(roomId.length).toBeGreaterThan(0);

    p1.disconnect();
    p2.disconnect();
  });

  it('prevents the same user from queuing twice', async () => {
    const tokens = await freshPair();
    const s1 = connectClient(url, tokens[0]);
    await waitFor(s1, 'connect');

    s1.emit('queue:join');
    const waiting = waitFor(s1, 'queue:waiting');
    s1.emit('queue:join'); // second emit — should be ignored
    await waiting;

    s1.disconnect();
  });
});

// ─── Move validation ─────────────────────────────────────────────────────────

describe('move:make', () => {
  it('player X can make the first move', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    const { board } = await makeMove(xPlayer, oPlayer, roomId, 0);
    expect(board[0]).toBe('X');

    p1.disconnect();
    p2.disconnect();
  });

  it('turn advances to O after X moves', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    const { turn } = await makeMove(xPlayer, oPlayer, roomId, 0);
    expect(turn).toBe('O');

    p1.disconnect();
    p2.disconnect();
  });

  it("rejects a move when it is not the player's turn", async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const oPlayer = p1Symbol === 'O' ? p1 : p2;

    const rejected = waitFor<{ reason: string }>(oPlayer, 'move:rejected');
    oPlayer.emit('move:make', { roomId, position: 0 }); // O tries to go first
    const { reason } = await rejected;
    expect(reason).toBe('Invalid move');

    p1.disconnect();
    p2.disconnect();
  });

  it('rejects an already-occupied cell', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    await makeMove(xPlayer, oPlayer, roomId, 0);
    await makeMove(oPlayer, xPlayer, roomId, 1);

    const rejected = waitFor<{ reason: string }>(xPlayer, 'move:rejected');
    xPlayer.emit('move:make', { roomId, position: 0 }); // X tries cell 0 again
    const { reason } = await rejected;
    expect(reason).toBe('Invalid move');

    p1.disconnect();
    p2.disconnect();
  });

  it('rejects an out-of-bounds position', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const xPlayer = p1Symbol === 'X' ? p1 : p2;

    const rejected = waitFor<{ reason: string }>(xPlayer, 'move:rejected');
    xPlayer.emit('move:make', { roomId, position: 9 });
    const { reason } = await rejected;
    expect(reason).toBe('Invalid move');

    p1.disconnect();
    p2.disconnect();
  });
});

// ─── Game end ────────────────────────────────────────────────────────────────

describe('game end', () => {
  type Sock = ReturnType<typeof connectClient>;

  // X wins via top row: X:0 O:3 X:1 O:4 X:2
  async function playXWins(xPlayer: Sock, oPlayer: Sock, roomId: string) {
    await makeMove(xPlayer, oPlayer, roomId, 0);
    await makeMove(oPlayer, xPlayer, roomId, 3);
    await makeMove(xPlayer, oPlayer, roomId, 1);
    await makeMove(oPlayer, xPlayer, roomId, 4);
    const gameOver = waitFor<{ board: (string | null)[]; result: string }>(xPlayer, 'game:over');
    xPlayer.emit('move:make', { roomId, position: 2 });
    return gameOver;
  }

  // Draw: X:0 O:1 X:2 O:3 X:5 O:4 X:6 O:8 X:7
  async function playDraw(xPlayer: Sock, oPlayer: Sock, roomId: string) {
    const moves: [Sock, Sock, number][] = [
      [xPlayer, oPlayer, 0], [oPlayer, xPlayer, 1],
      [xPlayer, oPlayer, 2], [oPlayer, xPlayer, 3],
      [xPlayer, oPlayer, 5], [oPlayer, xPlayer, 4],
      [xPlayer, oPlayer, 6], [oPlayer, xPlayer, 8],
    ];
    for (const [mover, observer, pos] of moves) {
      await makeMove(mover, observer, roomId, pos);
    }
    const gameOver = waitFor<{ board: (string | null)[]; result: string }>(xPlayer, 'game:over');
    xPlayer.emit('move:make', { roomId, position: 7 });
    return gameOver;
  }

  it('emits game:over with X_WINS when X completes a row', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    const { result } = await playXWins(xPlayer, oPlayer, roomId);
    expect(result).toBe('X_WINS');

    p1.disconnect();
    p2.disconnect();
  });

  it('emits game:over to both players', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    const p2GameOver = waitFor<{ result: string }>(oPlayer, 'game:over');
    await playXWins(xPlayer, oPlayer, roomId);
    const { result } = await p2GameOver;
    expect(result).toBe('X_WINS');

    p1.disconnect();
    p2.disconnect();
  });

  it('emits game:over with DRAW when the board is full with no winner', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    const { result } = await playDraw(xPlayer, oPlayer, roomId);
    expect(result).toBe('DRAW');

    p1.disconnect();
    p2.disconnect();
  });

  it('removes the game from Redis when the game ends', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    await playXWins(xPlayer, oPlayer, roomId);

    const stored = await redis.get(`game:${roomId}`);
    expect(stored).toBeNull();

    p1.disconnect();
    p2.disconnect();
  });

  it('persists the completed game to Postgres with the correct status', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId, p1Symbol } = await matchTwoPlayers(url, tokens);
    const [xPlayer, oPlayer] = p1Symbol === 'X' ? [p1, p2] : [p2, p1];

    await playXWins(xPlayer, oPlayer, roomId);

    const game = await prisma.game.findUnique({ where: { id: roomId } });
    expect(game?.status).toBe('X_WINS');
    expect(game?.endedAt).not.toBeNull();

    p1.disconnect();
    p2.disconnect();
  });
});

// ─── Admin ───────────────────────────────────────────────────────────────────

describe('admin:delete_game', () => {
  it('emits game:cancelled to both players and removes the game from Redis', async () => {
    const tokens = await freshPair();
    const { p1, p2, roomId } = await matchTwoPlayers(url, tokens);

    const p1Cancelled = waitFor(p1, 'game:cancelled');
    const p2Cancelled = waitFor(p2, 'game:cancelled');

    const admin = connectClient(url, tokens[0]);
    await waitFor(admin, 'connect');
    admin.emit('admin:join');
    admin.emit('admin:delete_game', { roomId });

    await Promise.all([p1Cancelled, p2Cancelled]);

    const stored = await redis.get(`game:${roomId}`);
    expect(stored).toBeNull();

    const game = await prisma.game.findUnique({ where: { id: roomId } });
    expect(game?.status).toBe('CANCELLED');

    p1.disconnect();
    p2.disconnect();
    admin.disconnect();
  });
});
