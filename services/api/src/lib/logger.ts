// services/api/src/lib/logger.ts
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

type LogPayload = Record<string, unknown>;

export const logger = {
  info: (o: LogPayload) => console.log(JSON.stringify({ level: "info", ...o })),
  error: (o: LogPayload) => console.error(JSON.stringify({ level: "error", ...o })),
};

export type RequestWithRid = Request & { rid?: string };

/**
 * Ensures every request has a request id AND every response echoes it as `x-request-id`.
 * Mobile sends `x-request-id` so Cloud Run logs can be correlated in <60 seconds.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const rid = (incoming && incoming.trim().length > 6 ? incoming.trim() : randomUUID()) as string;

  (req as RequestWithRid).rid = rid;
  res.setHeader("x-request-id", rid);

  next();
}

/**
 * Structured access logging (Cloud Run friendly).
 * Emits one JSON line per request on finish.
 */
export function accessLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const withRid = req as RequestWithRid & { uid?: string };

    logger.info({
      msg: "request",
      rid: withRid.rid ?? null,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms,
      uid: withRid.uid ?? null,
    });
  });
  next();
}
