import type { NextFunction, Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";

import type { RequestWithRid } from "../lib/logger";

export type AuthedRequest = Request & { uid?: string };

export async function authMiddleware(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rid = (req as RequestWithRid).rid ?? "unknown";

  try {
    const header = req.header("authorization") ?? req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({
        ok: false,
        error: {
          code: "MISSING_AUTH",
          message: "Missing Authorization: Bearer <token>",
          requestId: rid,
        },
      });
      return;
    }

    const idToken = header.slice("Bearer ".length).trim();
    const decoded = await getAuth().verifyIdToken(idToken, true);
    req.uid = decoded.uid;

    next();
    return;
  } catch {
    res.status(401).json({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
        requestId: rid,
      },
    });
    return;
  }
}
