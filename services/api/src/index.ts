// ─────────────────────────────────────────────────────────────
// Health endpoints (must be registered BEFORE any auth middleware)
// ─────────────────────────────────────────────────────────────
import express, { type Request, type Response } from "express";

const app = (global as any).apiApp || express();
(global as any).apiApp = app;

const healthPayload = () => ({
  ok: true,
  service: "api",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

// Root health (works even if service is mounted behind a path prefix)
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// Conventional health route
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// Optional: if your API is mounted at /api/... in some environments
app.get("/api/healthz", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// If running as a standalone server (not just imported)
if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  app.listen(port, () => {
    console.log(`api listening on :${port}`);
  });
}

export default app;
