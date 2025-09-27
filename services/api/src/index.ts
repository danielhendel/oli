// ──────────────────────────────────────────────────────────────────────────────
// Health endpoints (must be registered BEFORE any auth middleware)
// ──────────────────────────────────────────────────────────────────────────────
import express from "express";

// if you already have `const app = express()` above, reuse it.
// otherwise create it here:
const app = (global as any).apiApp || express();
(global as any).apiApp = app;

const healthPayload = () => ({
  ok: true,
  service: "api",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

// Root health (works even if service is mounted behind a path prefix)
app.get("/", (_req, res) => {
  res.status(200).json(healthPayload());
});

// Conventional health route
app.get("/healthz", (_req, res) => {
  res.status(200).json(healthPayload());
});

// Optional: if your API is mounted at /api/... in some environments
app.get("/api/healthz", (_req, res) => {
  res.status(200).json(healthPayload());
});

// NOTE: keep any auth middleware or route mounting BELOW this block.
// e.g.
// app.use(authMiddleware());
// app.use("/api", apiRouter);

// Existing export / server start below...
export default app;
