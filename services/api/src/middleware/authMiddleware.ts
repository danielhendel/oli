// services/api/src/middleware/authMiddleware.ts
/* Intent: Verify Firebase ID token and attach uid */
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

type AuthedRequest = Request & { uid?: string };

export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (!token) return res.status(401).json({ error: "missing_bearer_token" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_id_token" });
  }
}
