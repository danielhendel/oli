import { randomUUID } from "crypto";

import type { Request, Response, NextFunction } from "express";

type LogPayload = Record<string, unknown>;

export const logger = {
  info: (o: LogPayload) => console.log(JSON.stringify({ level: "info", ...o })),
  error: (o: LogPayload) => console.error(JSON.stringify({ level: "error", ...o })),
};

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const withRid = req as Request & { rid?: string | string[] };
  withRid.rid = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
  next();
}
