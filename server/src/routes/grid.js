import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicConfig } from '../config/env.js';
import { getLeaderboard, getSnapshot } from '../services/gridService.js';

const router = Router();

// Plain HTTP view of the board. The app itself gets this over the socket,
// this is handy for debugging and for clients that cannot use websockets.
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [tiles, leaderboard] = await Promise.all([getSnapshot(), getLeaderboard()]);
    res.json({ serverTime: Date.now(), config: publicConfig, tiles, leaderboard });
  })
);

export default router;
