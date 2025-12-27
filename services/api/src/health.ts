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

  // helpful for ops/debug, but NOT required for correctness
  const trace = req.header("x-cloud-trace-context")?.split("/")[0]?.trim();
  if (trace) body.requestId = trace;

  return body;
};

// Unauthenticated
router.get("/health", (req: Request, res: Response) => res.status(200).json(buildBody(req)));
router.get("/healthz", (req: Request, res: Response) => res.status(200).json(buildBody(req)));

export default router;
