import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";

export type AuthedRequest = Request & { uid?: string };

export async function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.header("authorization") ?? req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization: Bearer <token>" });
      return;
    }

    const idToken = header.slice("Bearer ".length).trim();
    const decoded = await getAuth().verifyIdToken(idToken, true);
    req.uid = decoded.uid;

    next();
    return;
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
}

