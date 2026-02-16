// cloudrun/src/security.ts
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

export const corsMiddleware = cors({
  origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:19006",
  credentials: true,
});

export const oauthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 100, standardHeaders: true, legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300, standardHeaders: true, legacyHeaders: false,
});
