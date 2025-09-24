import type { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

const perUidLimiter = new RateLimiterMemory({ points: 60, duration: 60 });

export async function limiterMiddleware(req: Request, res: Response, next: NextFunction) {
  const uid = (req as { uid?: string }).uid ?? "anon";
  try {
    await perUidLimiter.consume(uid);
    next();
  } catch {
    res.status(429).json({ error: "Too Many Requests" });
  }
}
