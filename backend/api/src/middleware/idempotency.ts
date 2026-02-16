import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from './auth.js';
import { hasIdempotencyKey, setIdempotencyKey } from '../clients/firestore.js';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

export const requireIdempotencyKey = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const key = req.header('Idempotency-Key');
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });
  if (await hasIdempotencyKey(key)) return res.status(409).json({ error: 'Duplicate request' });
  await setIdempotencyKey(key, DEFAULT_TTL_SECONDS);
  return next();
};
