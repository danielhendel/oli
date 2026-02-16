/* Intent: JSON structured logger for Cloud Logging */
import { Request, Response } from "express";

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = {
  traceId?: string;
  uid?: string;
  route?: string;
  latencyMs?: number;
  labels?: Record<string, string | number | boolean>;
};

function emit(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = {
    severity: level.toUpperCase(),
    message,
    ...fields,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
}

export const log = {
  debug: (m: string, f?: LogFields) => emit("debug", m, f),
  info: (m: string, f?: LogFields) => emit("info", m, f),
  warn: (m: string, f?: LogFields) => emit("warn", m, f),
  error: (m: string, f?: LogFields) => emit("error", m, f),
};

type RequestWithMeta = Request & { requestId?: string; uid?: string };

export function withReqLogging(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response) => {
    const r = req as RequestWithMeta;
    const start = Date.now();
    const traceId = r.requestId || r.headers["x-request-id"]?.toString() || cryptoRandom();
    const uid = r.uid;

    try {
      await handler(req, res);

      const fields: LogFields = {
        traceId,
        route: `${req.method} ${req.path}`,
        latencyMs: Date.now() - start,
      };
      if (uid) fields.uid = uid;

      log.info("request.ok", fields);
    } catch (err: unknown) {
      const fields: LogFields = {
        traceId,
        route: `${req.method} ${req.path}`,
        latencyMs: Date.now() - start,
        labels: { error: err instanceof Error ? err.message : String(err) },
      };
      if (uid) fields.uid = uid;

      log.error("request.err", fields);
      throw err;
    }
  };
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2);
}
