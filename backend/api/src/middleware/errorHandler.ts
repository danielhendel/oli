import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ msg: err?.message, stack: err?.stack }, 'unhandled');
  res.status(500).json({ error: 'Internal Server Error' });
};
