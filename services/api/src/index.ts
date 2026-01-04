// services/api/src/index.ts
import express, { type Request, type Response, type NextFunction, type Router } from "express";
import cors from "cors";

import healthRouter from "./health";
import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import { authMiddleware } from "./middleware/auth";
import { accessLogMiddleware, requestIdMiddleware, logger, type RequestWithRid } from "./lib/logger";

const assertNoUsersMeWriteRoutes = (router: Router): void => {
  // Regression invariant: /users/me must be READ-only.
  // Specifically: disallow POST /body/weight (duplicate ingestion door).
  const stack = (router as unknown as { stack?: unknown[] }).stack;
  if (!Array.isArray(stack)) return;

  for (const layer of stack) {
    const l = layer as {
      route?: {
        path?: string;
        methods?: Record<string, boolean>;
      };
    };

    const path = l.route?.path;
    const methods = l.route?.methods;

    if (path === "/body/weight" && methods?.post) {
      throw new Error("Invariant failed: /users/me must not expose POST /body/weight. Use POST /ingest only.");
    }
  }
};

assertNoUsersMeWriteRoutes(usersMeRoutes);

const app = express();

// Middleware order matters: request id first so EVERYTHING echoes x-request-id
app.use(requestIdMiddleware);
app.use(accessLogMiddleware);

app.use(cors());
app.use(express.json());

// Unauthed health endpoints
app.use(healthRouter);

// Nice default for root — helps sanity-check service is alive
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "oli-api" });
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

// Global error handler (typed, safe, request-id aware)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  // keep Express signature, but we don't use next
  void next;

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
