import http from 'http';
import { AddressInfo } from 'net';
import { io as ioc, Socket } from 'socket.io-client';
import supertest, { type Agent } from 'supertest';
import prisma from '../lib/prisma';
import { createApp } from '../app';
import { createSocketServer } from '../socket/index';

export async function startTestServer() {
  const app = createApp();
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  const url = `http://localhost:${port}`;

  return {
    url,
    api: supertest(app) as Agent,
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => httpServer.close(() => resolve()));
      }),
  };
}

export async function cleanDb() {
  await prisma.move.deleteMany();
  await prisma.game.deleteMany();
  await prisma.user.deleteMany();
}

export async function registerUser(api: Agent, username: string) {
  const res = await api.post('/auth/register').send({
    username,
    email: `${username}@test.com`,
    password: 'password123',
  });
  return res.body as { token: string; username: string };
}

export function connectClient(url: string, token: string): Socket {
  return ioc(url, { auth: { token }, forceNew: true });
}

export function waitFor<T>(socket: Socket, event: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export async function matchTwoPlayers(url: string, tokens: [string, string]) {
  const [s1, s2] = tokens.map((t) => connectClient(url, t));

  await Promise.all([waitFor(s1, 'connect'), waitFor(s2, 'connect')]);

  // Register listeners before emitting so we don't miss the event
  const p1Match = waitFor<{ roomId: string; mySymbol: 'X' | 'O' }>(s1, 'match:found');
  const p2Match = waitFor<{ roomId: string; mySymbol: 'X' | 'O' }>(s2, 'match:found');

  s1.emit('queue:join');
  s2.emit('queue:join');

  const [m1, m2] = await Promise.all([p1Match, p2Match]);

  return { p1: s1, p2: s2, roomId: m1.roomId, p1Symbol: m1.mySymbol, p2Symbol: m2.mySymbol };
}

/**
 * Emit a move and wait for BOTH players to receive move:broadcast.
 * Waiting for both prevents a race condition where the observer socket's
 * queued broadcast from the previous move resolves the wrong promise.
 */
export async function makeMove(
  mover: Socket,
  observer: Socket,
  roomId: string,
  position: number,
): Promise<{ board: (string | null)[]; turn: string }> {
  const moverBroadcast = waitFor<{ board: (string | null)[]; turn: string }>(mover, 'move:broadcast');
  const observerBroadcast = waitFor<unknown>(observer, 'move:broadcast');
  mover.emit('move:make', { roomId, position });
  const [result] = await Promise.all([moverBroadcast, observerBroadcast]);
  return result;
}
