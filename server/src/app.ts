import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import gamesRouter from './routes/games';

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use('/games', gamesRouter);
  return app;
}
