// Simple, dependency-free health router.
// Keep this tiny: no auth, no DB calls.
import { Router, Request, Response } from "express";

const router = Router();

function payload() {
  return {
    ok: true as const,
    service: "api",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

// Three conventional paths so the probe can hit whatever your env exposes.
router.get("/", (_req: Request, res: Response) => res.status(200).json(payload()));
router.get("/healthz", (_req: Request, res: Response) => res.status(200).json(payload()));
router.get("/api/healthz", (_req: Request, res: Response) => res.status(200).json(payload()));

export default router;
