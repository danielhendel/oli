// services/api/src/middleware/auth.ts
import type { NextFunction, Response } from "express";

import { admin } from "../firebaseAdmin";
import type { RequestWithRid } from "../lib/logger";

export type AuthedRequest = RequestWithRid & {
  uid?: string;
  /** Verified Firebase ID token `auth_time` (seconds since epoch), when present. */
  authTime?: number;
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

// NOTE: API Gateway often sets Authorization for gateway->backend auth,
// and forwards the original client Authorization as X-Forwarded-Authorization.
// Therefore we MUST prefer X-Forwarded-Authorization first.
const extractBearerToken = (req: AuthedRequest): { token: string | null; source: string } => {
  const rawXF =
    req.header("x-forwarded-authorization") ?? req.header("X-Forwarded-Authorization") ?? null;

  const rawAuth = req.header("authorization") ?? req.header("Authorization") ?? null;

  const raw = rawXF ?? rawAuth ?? "";

  const match = raw.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] ?? null;

  const source = rawXF ? "x-forwarded-authorization" : rawAuth ? "authorization" : "missing";
  return { token, source };
};

export const authMiddleware = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const rid = req.rid ?? res.getHeader("x-request-id")?.toString() ?? "missing";

  const { token, source } = extractBearerToken(req);
  if (!token) {
    return jsonUnauthorized(res, rid, `missing_bearer:${source}`);
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    if (typeof decoded.auth_time === "number" && Number.isFinite(decoded.auth_time)) {
      req.authTime = decoded.auth_time;
    } else {
      delete req.authTime;
    }
    return next();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verify_failed";
    return jsonUnauthorized(res, rid, `verify_failed:${msg.slice(0, 160)}`);
  }
};
