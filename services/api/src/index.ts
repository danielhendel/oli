/**
 * API entrypoint
 * - Health endpoints FIRST (no auth)
 * - Core middleware
 * - Auth
 * - Routes
 * - 404 + error handler
 *
 * Cloud Run will inject PORT; we also export `app` for tests.
 */

import express, { Request, Response, NextFunction, Router } from "express";
import type { AddressInfo } from "net";

// ──────────────────────────────────────────────────────────────────────────────
// Create app
// Reuse a single instance if this file is imported more than once (tests)
// ──────────────────────────────────────────────────────────────────────────────
const app: express.Express = (global as any).__apiApp || express();
(global as any).__apiApp = app;

// ──────────────────────────────────────────────────────────────────────────────
// Health endpoints (must be registered BEFORE any auth middleware)
// These are lightweight and dependency-free on purpose.
// ──────────────────────────────────────────────────────────────────────────────
const healthPayload = () => ({
  ok: true as const,
  service: "api",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
});

// Root (works even behind path prefixes)
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// Conventional health route
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// If some environments mount the API under /api
app.get("/api/healthz", (_req: Request, res: Response) => {
  res.status(200).json(healthPayload());
});

// ──────────────────────────────────────────────────────────────────────────────
// Core middleware (keep minimal; avoid adding new deps here)
// ──────────────────────────────────────────────────────────────────────────────
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────────────────────────────────────
// Auth middleware (applied AFTER health routes)
// ──────────────────────────────────────────────────────────────────────────────
let authMiddleware: ((req: Request, res: Response, next: NextFunction) => void) | null = null;
try {
  // Your project contains: services/api/src/middleware/authMiddleware.ts
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  authMiddleware = require("./middleware/authMiddleware").default ?? require("./middleware/authMiddleware");
} catch {
  // No-op: keep service running for health checks / local smoke
}

if (authMiddleware) {
  app.use(authMiddleware);
}

// ──────────────────────────────────────────────────────────────────────────────
/**
 * Routes
 * If you have a routes module, we mount it at /api.
 * We fall back to a minimal router so the service still responds cleanly
 * even if routes aren’t bundled in this revision.
 */
// ──────────────────────────────────────────────────────────────────────────────
let apiRouter: Router | null = null;
try {
  // Try the common default/named exports patterns
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("./routes");
  apiRouter = (mod.default as Router) ?? (mod.router as Router) ?? null;
} catch {
  // no routes file; fall back below
}

if (!apiRouter) {
  apiRouter = Router();
  apiRouter.get("/", (_req, res) => res.status(200).json({ ok: true, message: "API root" }));
}

app.use("/api", apiRouter);

// ──────────────────────────────────────────────────────────────────────────────
// 404 for everything else (after routes)
// ──────────────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: "Not Found" });
});

// ──────────────────────────────────────────────────────────────────────────────
// Centralized error handler
// ──────────────────────────────────────────────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  const code = err?.code ?? "internal_error";
  const message = status === 500 ? "Internal Server Error" : err?.message ?? "Request failed";
  // Avoid leaking internals in production
  const body: Record<string, unknown> = { ok: false, code, message };
  if (process.env.NODE_ENV !== "production" && err?.stack) {
    body.stack = String(err.stack);
  }
  res.status(status).json(body);
});

// ──────────────────────────────────────────────────────────────────────────────
// Export for tests & start server if run directly
// ──────────────────────────────────────────────────────────────────────────────
export default app;

if (require.main === module) {
  const port = Number(process.env.PORT ?? 8080);
  const server = app.listen(port, () => {
    const addr = server.address() as AddressInfo;
    // eslint-disable-next-line no-console
    console.log(`API listening on http://0.0.0.0:${addr.port}`);
  });
}
