// services/api/src/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

import healthRouter from "./health";
import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import { authMiddleware, type AuthedRequest } from "./middleware/auth";
import { accessLogMiddleware, requestIdMiddleware, logger, type RequestWithRid } from "./lib/logger";

const app = express();

// Middleware order matters: request id first so EVERYTHING echoes x-request-id
app.use(requestIdMiddleware);
app.use(accessLogMiddleware);

app.use(cors());
app.use(express.json());

// Health endpoints (unauth)
app.use(healthRouter);

/**
 * Auth health check
 * - 200 when signed in (valid Firebase ID token)
 * - 401 with a clear message when missing/invalid
 *
 * This MUST be behind authMiddleware (otherwise it proves nothing).
 */
app.get("/health/auth", authMiddleware, (req: AuthedRequest, res: Response) => {
  res.status(200).json({
    ok: true,
    uid: req.uid ?? null,
  });
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

