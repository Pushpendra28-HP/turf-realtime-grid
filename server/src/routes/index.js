import { Router } from 'express';
import mongoose from 'mongoose';
import usersRouter from './users.js';
import gridRouter from './grid.js';

const router = Router();

router.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp });
});

router.use('/users', usersRouter);
router.use('/grid', gridRouter);

export default router;
