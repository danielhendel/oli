import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from './auth.js';

const hits = new Map<string, { count: number; windowStart: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;

export const perUserRateLimit = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const uid = req.uid ?? 'anon';
  const now = Date.now();
  const curr = hits.get(uid) ?? { count: 0, windowStart: now };
  if (now - curr.windowStart > WINDOW_MS) {
    curr.count = 0; curr.windowStart = now;
  }
  curr.count += 1; hits.set(uid, curr);
  if (curr.count > MAX_PER_WINDOW) return res.status(429).json({ error: 'Rate limit' });
  return next();
};
