import { Server, Socket } from 'socket.io';
import { getAdminState, activeMatches } from './matchmaking';
import redis from '../lib/redis';
import prisma from '../lib/prisma';

export function registerAdminHandlers(io: Server, socket: Socket) {
  socket.on('admin:join', () => {
    socket.join('admin');
    socket.emit('admin:state', getAdminState());
  });

  socket.on('admin:leave', () => {
    socket.leave('admin');
  });

  socket.on('admin:delete_game', async ({ roomId }: { roomId: string }) => {
    await redis.del(`game:${roomId}`);
    await prisma.game.update({
      where: { id: roomId },
      data: { status: 'CANCELLED', endedAt: new Date() },
    });
    activeMatches.delete(roomId);
    io.to(roomId).emit('game:cancelled');
    io.to('admin').emit('admin:state', getAdminState());
  });
}
