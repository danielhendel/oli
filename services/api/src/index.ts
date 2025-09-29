// ─────────────────────────────────────────────────────────────
// Health endpoints (must be registered BEFORE any auth middleware)
// ─────────────────────────────────────────────────────────────
import express, { type Request, type Response } from "express";
import firebaseRouter from "./routes/firebase";

const app = (global as any).apiApp || express();
(global as any).apiApp = app;

const healthPayload = () => ({
  ok: true,
  service: "api",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

// Root health
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// Conventional health route
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// Optional /api/healthz
app.get("/api/healthz", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// Firebase health
app.use("/api/firebase", firebaseRouter);

// If running as standalone server
if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  app.listen(port, () => {
    console.log(`api listening on :${port}`);
  });
}

export default app;
