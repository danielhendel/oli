/**
 * Privacy-safe generic API access-log middleware.
 *
 * Emits exactly one typed completion event via `logApiAccessTelemetry`.
 * Never logs uid, raw URL, query values, headers, or bodies.
 */

import type { NextFunction, Request, Response } from "express";

import {
  buildApiAccessTelemetryEvent,
  logApiAccessTelemetry,
  type AccessLogRequestLike,
} from "../lib/apiAccessTelemetry";

export function accessLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAtMs = Date.now();
  let emitted = false;

  const emitOnce = (): void => {
    if (emitted) return;
    emitted = true;
    const durationMs = Math.max(0, Math.round(Date.now() - startedAtMs));
    logApiAccessTelemetry(
      buildApiAccessTelemetryEvent({
        req: req as AccessLogRequestLike,
        statusCode: res.statusCode,
        durationMs,
      }),
    );
  };

  res.on("finish", emitOnce);
  res.on("close", emitOnce);
  next();
}
