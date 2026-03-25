import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { registerMatchmaking } from './matchmaking';
import { registerGameHandlers } from './game';
import { registerAdminHandlers } from './admin';

export function createSocketServer(httpServer: http.Server) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true },
  });

  // JWT middleware — runs before any event handler
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      socket.data.userId = payload.sub;
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { username: true } });
      socket.data.username = user?.username ?? 'Unknown';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.data.username})`);

    registerMatchmaking(io, socket);
    registerGameHandlers(io, socket);
    registerAdminHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
