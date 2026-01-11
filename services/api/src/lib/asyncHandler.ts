// services/api/src/lib/asyncHandler.ts
import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async Express handler so ESLint doesn't complain about misused promises,
 * and so rejections are routed to the global error handler.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
