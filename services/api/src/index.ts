// services/api/src/index.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import firebaseRoutes from "./routes/firebase";
import eventsRoutes from "./routes/events";
import usersMeRoutes from "./routes/usersMe";
import { authMiddleware } from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.use("/firebase", firebaseRoutes);

/**
 * PUBLIC INGESTION ENTRYPOINT (TEMPORARY PATH)
 * Step 1: Wire the route + require auth.
 * Step 2 will change eventsRoutes to write canonical RawEvents under /users/{uid}/rawEvents.
 */
app.use("/ingest/events", authMiddleware, eventsRoutes);

/**
 * AUTHENTICATED READ BOUNDARY
 * Mobile app should read via Cloud Run API (not direct Firestore reads in screens).
 */
app.use("/users/me", authMiddleware, usersMeRoutes);

// Global error handler (typed, safe)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
