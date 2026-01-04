// services/api/src/middleware/auth.ts
import type { NextFunction, Response } from "express";

import { admin } from "../firebaseAdmin";
import type { RequestWithRid } from "../lib/logger";

export type AuthedRequest = RequestWithRid & {
  uid?: string;
};

type UnauthorizedJson = {
  ok: false;
  error: {
    code: "UNAUTHORIZED";
    message: "Unauthorized";
    requestId: string;
    reason?: string; // staging-only
  };
};

const isStaging = (): boolean => (process.env.APP_ENV ?? "").toLowerCase() === "staging";

const jsonUnauthorized = (res: Response, requestId: string, reason?: string) => {
  const body: UnauthorizedJson = {
    ok: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Unauthorized",
      requestId,
      ...(isStaging() && reason ? { reason } : {}),
    },
  };
  return res.status(401).json(body);
};

export const authMiddleware = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const rid = req.rid ?? res.getHeader("x-request-id")?.toString() ?? "missing";

  const header = req.header("authorization") ?? req.header("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];

  if (!token) {
    return jsonUnauthorized(res, rid, "missing_bearer");
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    return next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verify_failed";
    return jsonUnauthorized(res, rid, `verify_failed:${msg.slice(0, 160)}`);
  }
};
