import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /games — paginated game history for the authenticated user
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 20;

  const games = await prisma.game.findMany({
    where: {
      OR: [{ playerXId: req.userId }, { playerOId: req.userId }],
      status: { not: 'IN_PROGRESS' },
    },
    orderBy: { endedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      status: true,
      createdAt: true,
      endedAt: true,
      playerX: { select: { username: true } },
      playerO: { select: { username: true } },
      winner: { select: { username: true } },
    },
  });

  res.json(games);
});

// GET /games/leaderboard
router.get('/leaderboard', async (_req, res) => {
  const leaderboard = await prisma.user.findMany({
    select: {
      username: true,
      _count: { select: { wins: true } },
    },
    orderBy: { wins: { _count: 'desc' } },
    take: 10,
  });
  res.json(leaderboard.map((u) => ({ username: u.username, wins: u._count.wins })));
});

export default router;
