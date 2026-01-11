// services/api/src/index.ts
import express, { type Request, type Response, type NextFunction, type Router } from "express";
import cors from "cors";

import healthRouter from "./health";
import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import accountRoutes from "./routes/account";
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

/**
 * CORS (MVP-safe)
 * - Native/mobile + curl often send no Origin => allow.
 * - Browsers must match allowlist in CORS_ALLOW_ORIGINS (comma-separated).
 * - If allowlist is empty => deny browser origins by default (tight).
 *
 * Example:
 *   CORS_ALLOW_ORIGINS="http://localhost:8081,http://localhost:19006"
 */
const allowedOrigins = new Set(
  (process.env.CORS_ALLOW_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
);

app.use(
  cors({
    // Helps browsers read x-request-id
    exposedHeaders: ["x-request-id"],
    origin: (origin, cb) => {
      // Non-browser clients (curl, RN fetch) usually omit Origin
      if (!origin) return cb(null, true);

      // Tight-by-default: if you didn't configure allowlist, deny browsers
      if (allowedOrigins.size === 0) return cb(new Error("CORS origin denied"), false);

      if (allowedOrigins.has(origin)) return cb(null, true);

      return cb(new Error("CORS origin denied"), false);
    },
  })
);

// Optional hardening: prevent accidental huge payloads
app.use(express.json({ limit: "1mb" }));

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

/**
 * Account operations (authenticated)
 * - POST /export
 * - POST /account/delete
 */
app.use("/", authMiddleware, accountRoutes);

/**
 * CORS rejection handler
 * If a browser Origin is denied, cors() forwards an Error into Express.
 * Without this, it would be reported as a 500 "unhandled_error".
 */
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const message = err instanceof Error ? err.message : "";

  if (message === "CORS origin denied") {
    const rid = (req as RequestWithRid).rid ?? "unknown";

    logger.info({
      msg: "cors_denied",
      rid,
      origin: req.headers.origin ?? null,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(403).json({
      ok: false,
      error: {
        code: "CORS_DENIED",
        message: "CORS origin denied",
        requestId: rid,
      },
    });
    return;
  }

  next(err);
});

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
