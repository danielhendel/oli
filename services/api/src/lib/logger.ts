// services/api/src/lib/logger.ts
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

type LogPayload = Record<string, unknown>;

export const logger = {
  info: (o: LogPayload) => console.log(JSON.stringify({ level: "info", ...o })),
  warn: (o: LogPayload) => console.warn(JSON.stringify({ level: "warn", ...o })),
  error: (o: LogPayload) => console.error(JSON.stringify({ level: "error", ...o })),
};

export type RequestWithRid = Request & { rid?: string };

/**
 * Ensures every request has a request id AND every response echoes it as `x-request-id`.
 * Mobile sends `x-request-id` so Cloud Run logs can be correlated in <60 seconds.
 *
 * Note: access-log telemetry may replace a non-UUID request id with a fresh UUID for
 * logging only — HTTP response correlation still uses this `rid` / header value.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const rid = (incoming && incoming.trim().length > 6 ? incoming.trim() : randomUUID()) as string;

  (req as RequestWithRid).rid = rid;
  res.setHeader("x-request-id", rid);

  next();
}
