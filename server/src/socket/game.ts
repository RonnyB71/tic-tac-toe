import { Server, Socket } from 'socket.io';
import { GameStatus } from '@prisma/client';
import redis from '../lib/redis';
import prisma from '../lib/prisma';
import { isValidMove, applyMove, checkResult } from '../game/logic';
import { GameSession, activeMatches, getAdminState } from './matchmaking';

export function registerGameHandlers(io: Server, socket: Socket) {
  socket.on('move:make', async ({ roomId, position }: { roomId: string; position: number }) => {
    const userId = (socket.data as { userId: string }).userId;
    console.log('[game] move:make received', { roomId, position, userId });

    const raw = await redis.get(`game:${roomId}`);
    if (!raw) {
      console.log('[game] move:rejected - game not found in Redis');
      socket.emit('move:rejected', { reason: 'Game not found' });
      return;
    }

    const session: GameSession = JSON.parse(raw);
    const symbol = session.playerX === userId ? 'X' : session.playerO === userId ? 'O' : null;
    console.log('[game] symbol resolved', { symbol, turn: session.turn, valid: symbol ? isValidMove(session.board, position, symbol, session.turn) : false });

    if (!symbol || !isValidMove(session.board, position, symbol, session.turn)) {
      console.log('[game] move:rejected - invalid move', { symbol, position, board: session.board, turn: session.turn });
      socket.emit('move:rejected', { reason: 'Invalid move' });
      return;
    }

    session.board = applyMove(session.board, position, symbol);
    session.turn = session.turn === 'X' ? 'O' : 'X';

    const result = checkResult(session.board);

    if (result) {
      await persistGame(session, result);
      await redis.del(`game:${roomId}`);
      activeMatches.delete(roomId);
      io.to('admin').emit('admin:state', getAdminState());
      io.to(roomId).emit('game:over', { board: session.board, result });
    } else {
      await redis.set(`game:${roomId}`, JSON.stringify(session));
      io.to(roomId).emit('move:broadcast', { board: session.board, position, symbol, turn: session.turn });
    }
  });
}

async function persistGame(session: GameSession, result: string) {
  const winnerId =
    result === 'X_WINS' ? session.playerX :
    result === 'O_WINS' ? session.playerO :
    undefined;

  await prisma.game.update({
    where: { id: session.gameId },
    data: {
      status: result as GameStatus,
      winnerId: winnerId ?? null,
      endedAt: new Date(),
    },
  });
}
