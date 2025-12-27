// services/api/src/health.ts
import { Router, type Request, type Response } from "express";

const router = Router();

type HealthOk = {
  ok: true;
  service: "oli-api";
  env?: string;
  requestId?: string;
  timestamp: string;
  uptimeSec: number;
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

  // Use trace id if present (still fine)
  const requestId = req.header("x-cloud-trace-context")?.split("/")[0]?.trim();
  if (requestId) body.requestId = requestId;

  return body;
};

// ✅ public health endpoint
router.get("/health", (req: Request, res: Response) => res.status(200).json(buildBody(req)));

// ✅ use /ready or /live (NOT /healthz)
router.get("/ready", (req: Request, res: Response) => res.status(200).json(buildBody(req)));

export default router;
