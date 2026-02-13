// services/api/src/lib/logger.ts
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

type LogPayload = Record<string, unknown>;

/** In test, logger must not write to console (zero leakage). Detect Jest/test env once at load. */
const isTest =
  process.env.NODE_ENV === "test" || typeof process.env.JEST_WORKER_ID !== "undefined";

// Intentional no-op in test; signature matches logger.info/error so we can swap.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function noop(_payload: LogPayload): void {
  /* no-op in test; avoids console output leakage */
}

export const logger = {
  info: isTest ? noop : (o: LogPayload) => console.log(JSON.stringify({ level: "info", ...o })),
  error: isTest ? noop : (o: LogPayload) => console.error(JSON.stringify({ level: "error", ...o })),
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
