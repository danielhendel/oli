// services/api/src/health.ts
import { Router, type Request, type Response } from "express";

import { authMiddleware, type AuthedRequest } from "./middleware/auth";
import type { RequestWithRid } from "./lib/logger";

const router = Router();

type HealthOk = {
  ok: true;
  service: "oli-api";
  env?: string;
  requestId?: string;
  timestamp: string;
  uptimeSec: number;
};

type HealthAuthOk = {
  ok: true;
  service: "oli-api";
  env?: string;
  requestId: string;
  timestamp: string;
  uptimeSec: number;
  uid: string;
};

const buildBody = (req: Request): HealthOk => {
  const body: HealthOk = {
    ok: true,
    service: "oli-api",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  };

  const env = process.env.APP_ENV?.trim();
  if (env) body.env = env;

  // Prefer our app-level request id if present (set by requestIdMiddleware)
  const rid = (req as RequestWithRid).rid?.trim();
  if (rid) {
    body.requestId = rid;
    return body;
  }

  // Fallback: trace id if present (still fine)
  const trace = req.header("x-cloud-trace-context")?.split("/")[0]?.trim();
  if (trace) body.requestId = trace;

  return body;
};

// ✅ public health endpoint
router.get("/health", (req: Request, res: Response) => res.status(200).json(buildBody(req)));

// ✅ use /ready or /live (NOT /healthz)
router.get("/ready", (req: Request, res: Response) => res.status(200).json(buildBody(req)));

/**
 * ✅ authenticated health endpoint
 * Purpose:
 * - validates Firebase ID token verification on the deployed Cloud Run API
 * - returns structured JSON (never HTML)
 */
router.get("/health/auth", authMiddleware, (req: AuthedRequest, res: Response) => {
  const rid = (req as RequestWithRid).rid ?? "unknown";
  const env = process.env.APP_ENV?.trim();

  const out: HealthAuthOk = {
    ok: true,
    service: "oli-api",
    ...(env ? { env } : {}),
    requestId: rid,
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    uid: req.uid ?? "unknown",
  };

  res.status(200).json(out);
});

export default router;
