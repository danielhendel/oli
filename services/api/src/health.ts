// services/api/src/health.ts
import { Router, type Request, type Response } from "express";

const router = Router();

type HealthOk = {
  ok: true;
  service: "oli-api";
  env?: string;
  timestamp: string;
  uptimeSec: number;
};

const buildBody = (): HealthOk => {
  const body: HealthOk = {
    ok: true,
    service: "oli-api",
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  };

  const env = process.env.APP_ENV?.trim();
  if (env) body.env = env;

  return body;
};

// Public health check (no auth)
router.get("/health", (_req: Request, res: Response) => res.status(200).json(buildBody()));

/**
 * Auth health check
 * - This route MUST be mounted behind authMiddleware in index.ts
 * - If it is hit, auth is already verified.
 */
router.get("/health/auth", (_req: Request, res: Response) => res.status(200).json({ ok: true }));

export default router;
