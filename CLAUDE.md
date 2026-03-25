# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online multiplayer tic-tac-toe with real-time WebSocket gameplay, JWT auth, and a persistent leaderboard.

## Repository Structure

```
/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express + Socket.io backend
├── docker-compose.yml
└── .github/workflows/
```

## Development Commands

### Start everything locally
```bash
docker compose up          # Postgres + Redis + Node server
cd client && npm run dev   # Vite dev server (separate terminal)
```

### Server
```bash
cd server
npm run dev        # nodemon watch mode
npm run lint       # ESLint
npm test           # run test suite
npm run test:watch # watch mode
```

### Client
```bash
cd client
npm run dev        # Vite HMR dev server
npm run build      # production build
npm run lint       # ESLint
npm test           # Vitest
```

### Database (Prisma)
```bash
cd server
npx prisma migrate dev     # apply migrations + regenerate client
npx prisma migrate deploy  # apply migrations in CI/prod
npx prisma studio          # visual DB browser
npx prisma generate        # regenerate client without migrating
```

## Architecture

### Auth flow
REST endpoints (`POST /auth/register`, `POST /auth/login`) issue JWTs. The token is sent as a Bearer header on REST calls and passed in the Socket.io handshake `auth` object so the same middleware can verify identity on WebSocket connections.

### Matchmaking & game sessions
1. Authenticated client emits `queue:join` → server adds them to a waiting queue.
2. When two players are queued, server creates a room, stores the initial game state in Redis, and emits `match:found` to both clients with the room ID.
3. All in-game events (`move:make`, `move:broadcast`, `game:over`) flow through Socket.io rooms.
4. On game end (win/draw/disconnect), the server persists the completed game and moves to Postgres via Prisma, then evicts the Redis key.

### Game logic authority
Win detection and turn validation run **only on the server**. The client renders optimistically but must wait for `move:broadcast` confirmation before updating authoritative state. Reject invalid moves server-side and emit `move:rejected` back to the sender.

### State management (client)
Zustand holds ephemeral UI state: current board, whose turn, match status, and the connected socket instance. Persistent data (user profile, game history) is fetched from REST and kept in component-local state or a separate Zustand slice.

### Redis ↔ Postgres sync
Active games live entirely in Redis (`game:{roomId}` hash). When a game ends the server writes the full game record and move list to Postgres in a single Prisma transaction, then deletes the Redis key.

## Key Conventions

- **Server-side authority**: never trust client-sent board state; recompute from stored moves.
- **JWT on sockets**: verify token in Socket.io `io.use()` middleware before any event handler runs.
- **Prisma schema** is the source of truth for the DB schema — edit `schema.prisma`, never write raw DDL.
- **Environment variables**: use `.env` (gitignored) locally; Docker Compose injects them for services.

## Environment Variables

| Variable | Where used |
|---|---|
| `DATABASE_URL` | Prisma / Postgres connection string |
| `REDIS_URL` | Redis connection |
| `JWT_SECRET` | Token signing |
| `PORT` | Express server port |
| `CLIENT_URL` | CORS origin for Express + Socket.io |
| `VITE_SERVER_URL` | Client-side Socket.io server URL |
