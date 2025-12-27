// services/api/src/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

import healthRouter from "./health";
import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import { authMiddleware } from "./middleware/auth";
import {
  accessLogMiddleware,
  requestIdMiddleware,
  logger,
  type RequestWithRid,
} from "./lib/logger";

const app = express();

// Middleware order matters: request id first so EVERYTHING echoes x-request-id
app.use(requestIdMiddleware);
app.use(accessLogMiddleware);

app.use(cors());
app.use(express.json());

// Health endpoints (unauth)
app.use(healthRouter);

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
 * Cloud Run entrypoint
 * - Cloud Run sets PORT (usually 8080)
 * - Must listen on process.env.PORT
 *
 * NOTE: If your Dockerfile runs `node dist/server.js`, then `server.ts`
 * should import this app and listen there. This block is still useful for
 * local runs like `node dist/index.js`.
 */
const port = (() => {
  const raw = process.env.PORT?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 8080;
})();

const isRunningInCloudRun = Boolean(process.env.K_SERVICE);

// Only start the server when this file is the program entrypoint.
// (Prevents double-listen in tests/imports.)
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
