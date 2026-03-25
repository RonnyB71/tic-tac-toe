# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Online multiplayer tic-tac-toe with real-time WebSocket gameplay, JWT auth, and an admin dashboard.

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
docker compose up          # Postgres + Redis (and optionally the Node server)
cd client && npm run dev   # Vite dev server (separate terminal)
cd server && npm run dev   # nodemon watch mode (separate terminal)
```

### Server
```bash
cd server
npm run dev        # nodemon watch mode
npm run lint       # ESLint
npm test           # run full test suite (requires docker compose up)
npm run test:watch # watch mode
```

### Run a single test file
```bash
cd server && npx jest src/__tests__/game.test.ts
cd client && npx vitest run src/__tests__/Cell.test.tsx
```

### Client
```bash
cd client
npm run dev    # Vite HMR dev server
npm run build  # production build
npm run lint   # ESLint
npm test       # Vitest
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
`POST /auth/register` and `POST /auth/login` return a JWT. The token is sent as a `Bearer` header on REST calls and in the Socket.io handshake `auth.token` so the same JWT middleware covers both transports. `socket.data.userId` and `socket.data.username` are set by the middleware before any event handler runs.

### Matchmaking & game sessions
1. Client emits `queue:join` → server adds socket to an in-memory queue array.
2. When two players are queued, server creates a Prisma `Game` record, stores initial game state in Redis (`game:{roomId}` JSON string), joins both sockets to the room, then emits `match:found` **individually** to each socket with `{ roomId, mySymbol }` — the client does not need to figure out its own symbol.
3. Disconnecting while queued automatically removes the player from the queue.
4. In-game events: client emits `move:make` → server validates → broadcasts `move:broadcast` to the room, or emits `move:rejected` to the sender.
5. On game end, server updates the Postgres `Game` record with the result, deletes the Redis key, and emits `game:over` to the room.

### Game logic authority
All win detection and turn validation run on the server only (`server/src/game/logic.ts`). The client does **not** update board state optimistically — it waits for `move:broadcast` from the server.

### Client state
Zustand (`gameStore`) holds ephemeral game state: board, turn, mySymbol, roomId, status. This store is **not persisted** — a page refresh on `/game/:roomId` loses all state. The `match:found` socket event (received in Lobby) is the only place `setMatch` is called to initialize the store before navigating to the game route.

### Redis ↔ Postgres
Active game state lives in Redis as a JSON string keyed `game:{roomId}`. On game end the `Game` row is updated in Postgres and the Redis key is deleted. The `activeMatches` Map in `matchmaking.ts` is an in-memory index used by the admin dashboard; it is seeded from Postgres on server startup via `initActiveMatches()`.

### Admin
`/admin` shows the live queue and active matches via `admin:join` / `admin:state` socket events. Admins can cancel a game with `admin:delete_game` which evicts Redis, marks the Postgres record `CANCELLED`, and emits `game:cancelled` to the players.

### App / server separation
`server/src/app.ts` exports `createApp()` (Express app factory). `server/src/index.ts` calls it and starts the HTTP server. Tests import `createApp()` directly to start isolated test servers without calling `initActiveMatches()`.

## Testing

### Server (Jest + ts-jest)
Integration tests hit a real Postgres database (`tictactoe_test`) and Redis DB 1. Config lives in `server/.env.test`. The first run automatically creates the database and runs migrations via `globalSetup.ts`.

```bash
cd server && npm test
```

Test helpers in `src/__tests__/helpers.ts` provide `startTestServer`, `matchTwoPlayers`, `makeMove`, and `waitFor`. `makeMove` waits for **both** players to receive `move:broadcast` before resolving — this prevents a race condition where the observer socket's queued event from the previous move resolves the wrong promise.

### Client (Vitest + happy-dom + Testing Library)
```bash
cd client && npm test
```

## Key Conventions

- **Prisma schema** is the source of truth — edit `schema.prisma`, never write raw DDL.
- **Environment variables**: use `.env` (gitignored) locally; Docker Compose injects them for containers. `.env.test` (committed) holds test DB config.
- **Socket.io rooms**: `io.to(roomId).emit` reaches both players; `socket.emit` reaches only the sender. Use the right one intentionally.
- **match:found payload**: `{ roomId, mySymbol }` — the server resolves each player's symbol and sends it directly.

## Environment Variables

| Variable | Where used |
|---|---|
| `DATABASE_URL` | Prisma / Postgres connection string |
| `REDIS_URL` | ioredis connection |
| `JWT_SECRET` | Token signing/verification |
| `PORT` | Express server port |
| `CLIENT_URL` | CORS origin for Express + Socket.io |
| `VITE_SERVER_URL` | Client-side Socket.io server URL |
