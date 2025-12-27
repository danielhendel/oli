// services/api/src/index.ts
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

import healthRouter from "./health";
import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import { authMiddleware } from "./middleware/auth";
import { accessLogMiddleware, requestIdMiddleware, logger, type RequestWithRid } from "./lib/logger";

/**
 * Express app (NO LISTENING HERE)
 *
 * This module must be side-effect free:
 * - It should only build and export the Express app.
 * - Cloud Run startup (listen on PORT) happens in `server.ts`.
 *
 * Why:
 * - Avoid double-listen bugs
 * - Make runtime deterministic
 * - Keep tests/imports safe
 */

const app = express();

// Middleware order matters: request id first so EVERYTHING echoes x-request-id
app.use(requestIdMiddleware);
app.use(accessLogMiddleware);

app.use(cors());
app.use(express.json());

// Health endpoints (unauth + authed)
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
