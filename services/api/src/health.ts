// services/api/src/health.ts
import { Router, type Request, type Response } from "express";

import { authMiddleware, type AuthedRequest } from "./middleware/auth";
import type { RequestWithRid } from "./lib/logger";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                               Shared helpers                                */
/* -------------------------------------------------------------------------- */

const buildBody = (req: Request): HealthOk => {
  const body: HealthOk = {
    ok: true,
    service: "oli-api",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  };

  const env = process.env.APP_ENV?.trim();
  if (env) body.env = env;

  // Prefer app-level request id (set by requestIdMiddleware)
  const rid = (req as RequestWithRid).rid?.trim();
  if (rid) {
    body.requestId = rid;
    return body;
  }

  // Fallback: GCP trace id
  const trace = req.header("x-cloud-trace-context")?.split("/")[0]?.trim();
  if (trace) body.requestId = trace;

  return body;
};

const publicHealthHandler = (req: Request, res: Response) => {
  res.status(200).json(buildBody(req));
};

/* -------------------------------------------------------------------------- */
/*                               Public endpoints                              */
/* -------------------------------------------------------------------------- */

// Primary public health endpoint
router.get("/health", publicHealthHandler);

// Common probe alias (CI / k8s / tooling)
// NOTE: may be intercepted by some Google frontends in certain setups
router.get("/healthz", publicHealthHandler);

// ✅ Reliable probe path through API Gateway when /healthz is intercepted
router.get("/_healthz", publicHealthHandler);

// Readiness / liveness aliases
router.get("/ready", publicHealthHandler);
router.get("/live", publicHealthHandler);

/* -------------------------------------------------------------------------- */
/*                            Authenticated health                             */
/* -------------------------------------------------------------------------- */

/**
 * Purpose:
 * - Validates Firebase ID token verification
 * - Ensures authenticated requests work end-to-end
 * - Always returns structured JSON
 */
router.get("/health/auth", authMiddleware, (req: AuthedRequest, res: Response) => {
  const env = process.env.APP_ENV?.trim();

  const out: HealthAuthOk = {
    ok: true,
    service: "oli-api",
    ...(env ? { env } : {}),
    requestId: (req as RequestWithRid).rid ?? "unknown",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    uid: req.uid ?? "unknown",
  };

  res.status(200).json(out);
});

export default router;