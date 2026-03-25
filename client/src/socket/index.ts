import { io } from 'socket.io-client';

// Singleton socket — call connect() after the user logs in
export const socket = io(import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001', {
  autoConnect: false,
});

export function connectSocket(token: string) {
  socket.auth = { token };
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
