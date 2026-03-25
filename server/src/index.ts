import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { createSocketServer } from './socket/index';
import { initActiveMatches } from './socket/matchmaking';

const app = createApp();
const httpServer = http.createServer(app);

createSocketServer(httpServer);

const PORT = Number(process.env.PORT ?? 3001);
initActiveMatches().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
