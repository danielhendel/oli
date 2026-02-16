import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { authMiddleware } from "./middleware/auth";
import { requestIdMiddleware, logger } from "./lib/logger";
import { limiterMiddleware } from "./middleware/ratelimit";
import eventsRouter from "./routes/events";
import accountRouter from "./routes/account";

const app = express();
app.disable("x-powered-by");

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(requestIdMiddleware);
app.use(morgan("combined"));

/**
 * Public health endpoints (no auth)
 * Expose both "/" and "/healthz" to play nice with different checkers.
 */
app.get("/", (_req, res) => res.status(200).json({ ok: true, service: "api" }));
app.head("/", (_req, res) => res.status(200).end());
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// Authenticated routes
app.use(authMiddleware);
app.use(limiterMiddleware);

// Feature routers
app.use("/events", eventsRouter);
app.use("/", accountRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not Found", route: req.path }));

// Error handler
app.use((
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  logger.error({ err, msg: "Unhandled error" });
  res.status(500).json({ error: "Internal Server Error" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => logger.info({ msg: `API listening on :${port}` }));

export default app;
