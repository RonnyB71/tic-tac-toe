import { Server, Socket } from 'socket.io';
import redis from '../lib/redis';
import prisma from '../lib/prisma';
import { emptyBoard } from '../game/logic';

export interface QueueEntry {
  userId: string;
  username: string;
  socket: Socket;
  joinedAt: Date;
}

export interface ActiveMatch {
  roomId: string;
  playerX: { userId: string; username: string };
  playerO: { userId: string; username: string };
  startedAt: Date;
}

export interface GameSession {
  board: (string | null)[];
  turn: 'X' | 'O';
  playerX: string; // userId
  playerO: string; // userId
  gameId: string;
}

const queue: QueueEntry[] = [];
export const activeMatches = new Map<string, ActiveMatch>();

export async function initActiveMatches() {
  const games = await prisma.game.findMany({
    where: { status: 'IN_PROGRESS' },
    include: {
      playerX: { select: { id: true, username: true } },
      playerO: { select: { id: true, username: true } },
    },
  });
  for (const game of games) {
    activeMatches.set(game.id, {
      roomId: game.id,
      playerX: { userId: game.playerX.id, username: game.playerX.username },
      playerO: { userId: game.playerO.id, username: game.playerO.username },
      startedAt: game.createdAt,
    });
  }
  console.log(`Seeded ${games.length} active match(es) from database`);
}

export function getAdminState() {
  return {
    queue: queue.map(({ userId, username, joinedAt }) => ({ userId, username, joinedAt })),
    activeMatches: Array.from(activeMatches.values()),
  };
}

function broadcastAdminState(io: Server) {
  io.to('admin').emit('admin:state', getAdminState());
}

export function registerMatchmaking(io: Server, socket: Socket) {
  const { userId, username } = socket.data as { userId: string; username: string };

  socket.on('queue:join', async () => {
    if (queue.some((e) => e.userId === userId)) return;
    queue.push({ userId, username, socket, joinedAt: new Date() });
    broadcastAdminState(io);

    if (queue.length < 2) {
      socket.emit('queue:waiting');
      return;
    }

    const [p1, p2] = queue.splice(0, 2);

    const game = await prisma.game.create({
      data: { playerXId: p1.userId, playerOId: p2.userId },
    });

    const session: GameSession = {
      board: emptyBoard(),
      turn: 'X',
      playerX: p1.userId,
      playerO: p2.userId,
      gameId: game.id,
    };

    await redis.set(`game:${game.id}`, JSON.stringify(session));

    const roomId = game.id;
    p1.socket.join(roomId);
    p2.socket.join(roomId);

    activeMatches.set(roomId, {
      roomId,
      playerX: { userId: p1.userId, username: p1.username },
      playerO: { userId: p2.userId, username: p2.username },
      startedAt: new Date(),
    });
    broadcastAdminState(io);

    p1.socket.emit('match:found', { roomId, mySymbol: 'X' });
    p2.socket.emit('match:found', { roomId, mySymbol: 'O' });
  });

  socket.on('queue:leave', () => {
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      broadcastAdminState(io);
    }
  });

  socket.on('disconnect', () => {
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      broadcastAdminState(io);
    }
  });

  socket.on('lobby:check_active', () => {
    for (const match of activeMatches.values()) {
      if (match.playerX.userId === userId || match.playerO.userId === userId) {
        const symbol = match.playerX.userId === userId ? 'X' : 'O';
        socket.emit('lobby:active_game', { roomId: match.roomId, symbol });
        return;
      }
    }
  });
}
