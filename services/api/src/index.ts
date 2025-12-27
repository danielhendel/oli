// services/api/src/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

import healthRouter from "./health";
import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import { authMiddleware } from "./middleware/auth";
import { accessLogMiddleware, requestIdMiddleware, logger, type RequestWithRid } from "./lib/logger";

const app = express();

// Middleware order matters: request id first so EVERYTHING echoes x-request-id
app.use(requestIdMiddleware);
app.use(accessLogMiddleware);

app.use(cors());
app.use(express.json());

// Public health endpoints (unauth)
app.use(healthRouter);

// Authed health check — verifies auth boundary works end-to-end
app.get("/health/auth", authMiddleware, (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

/**
 * Firebase helper routes (authenticated) — used for client-side token debugging.
 */
app.use("/firebase", authMiddleware, firebaseRoutes);

/**
 * Ingestion boundary (authenticated).
 */
app.use("/ingest", authMiddleware, eventsRoutes);

/**
 * AUTHENTICATED READ BOUNDARY
 */
app.use("/users/me", authMiddleware, usersMeRoutes);

// (Optional) nice default for root — helps sanity-check service is alive
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "oli-api" });
});

// Global error handler (typed, safe, request-id aware)
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const rid = (req as RequestWithRid).rid ?? "unknown";
  const message = err instanceof Error ? err.message : "Unknown error";

  logger.error({
    msg: "unhandled_error",
    rid,
    path: req.originalUrl,
    method: req.method,
    message,
  });

  res.status(500).json({
    ok: false,
    error: {
      code: "INTERNAL",
      message: "Internal Server Error",
      requestId: rid,
    },
  });
});

export default app;

/**
 * Cloud Run entrypoint (only when executed directly)
 *
 * NOTE:
 * - Cloud Run uses `PORT` (usually 8080)
 * - Your Dockerfile runs `node dist/server.js`, so Cloud Run will typically
 *   start the server from server.ts. This block is for safety/local usage
 *   when running `node dist/index.js`.
 */
const port = (() => {
  const raw = process.env.PORT?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8080;
})();

const isRunningInCloudRun = Boolean(process.env.K_SERVICE);

if (require.main === module) {
  app.listen(port, () => {
    logger.info({
      msg: "api_listening",
      port,
      env: process.env.NODE_ENV ?? "unknown",
      cloudRun: isRunningInCloudRun,
      service: process.env.K_SERVICE ?? null,
      revision: process.env.K_REVISION ?? null,
    });
  });
}
