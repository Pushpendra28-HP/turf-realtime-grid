import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { PALETTE, randomColor } from '../utils/palette.js';
import { createUser } from '../services/userService.js';

const router = Router();

const joinLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please wait a minute.' } },
});

const joinSchema = z.object({
  name: z
    .string({ required_error: 'Please enter a name' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(16, 'Name must be at most 16 characters')
    .regex(/^[\p{L}\p{N} _-]+$/u, 'Use only letters, numbers, spaces, _ or -')
    .transform((s) => s.replace(/\s+/g, ' ')),
  color: z.enum(PALETTE, { errorMap: () => ({ message: 'Please pick one of the available colours' }) }).optional(),
});

router.post(
  '/join',
  joinLimiter,
  validate(joinSchema),
  asyncHandler(async (req, res) => {
    const { name, color } = req.body;
    const { user, token } = await createUser({ name, color: color ?? randomColor() });
    res.status(201).json({ user, token });
  })
);

export default router;
