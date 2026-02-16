// cloudrun/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";

import type { AuthedRequest } from "./middleware/auth.js";
import { requireFirebaseUser } from "./middleware/auth.js";

// Initialize Firebase Admin exactly once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check
app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// Protected route example
app.get("/me", requireFirebaseUser, (req, res) => {
  const uid = (req as AuthedRequest).uid ?? (req as AuthedRequest).firebaseUid;
  res.json({ ok: true, uid });
});

// Start server (not in tests)
if (process.env.NODE_ENV !== "test") {
  const PORT = Number(process.env.PORT ?? 8080);
  app.listen(PORT, () => {
    console.log(`[API] Cloud Run listening on ${PORT}`);
  });
}

export default app;
