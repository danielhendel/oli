/**
 * Phase 3B — Invoker-only protection for scheduled/job endpoints.
 * Accepts either:
 * 1) x-goog-authenticated-user-email (Cloud Run IAM-injected), OR
 * 2) Authorization: Bearer <Google-signed ID token> verified with verifyIdToken (audience + allowlist).
 * Fail-closed: production requires explicit allowlist and (for token path) INVOKER_TOKEN_AUDIENCE.
 * Token path: allow by email (WITHINGS_PULL_INVOKER_EMAILS) or by sub (WITHINGS_PULL_INVOKER_SUBS).
 * SA ID tokens often omit email; sub is always present and can be allowlisted.
 * Never log tokens or Authorization header.
 */

import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { logger } from "../lib/logger";
import type { RequestWithRid } from "../lib/logger";

const HEADER_IDENTITY = "x-goog-authenticated-user-email";
const AUTH_HEADER = "authorization";

let cachedOAuth2Client: OAuth2Client | null = null;

function getOAuth2Client(): OAuth2Client {
  if (!cachedOAuth2Client) cachedOAuth2Client = new OAuth2Client();
  return cachedOAuth2Client;
}

function getAllowedInvokerEmails(): Set<string> {
  const raw = (process.env.WITHINGS_PULL_INVOKER_EMAILS ?? "").trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Comma-separated sub (subject) allowlist for SA tokens that omit email. */
function getAllowedInvokerSubs(): Set<string> {
  const raw = (process.env.WITHINGS_PULL_INVOKER_SUBS ?? "").trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function getInvokerTokenAudience(): string {
  return (process.env.INVOKER_TOKEN_AUDIENCE ?? "").trim();
}

function isProd(): boolean {
  return (process.env.NODE_ENV ?? "").toLowerCase() === "production";
}

/** Extract email from header value (Cloud Run may prefix with "accounts.google.com:") */
function emailFromHeaderValue(value: string): string {
  const email = value.includes(":") ? value.split(":")[1]?.trim() ?? value : value;
  return email.trim();
}

/** Extract Bearer token from Authorization header; never log. Returns null if missing or not Bearer. */
function extractBearerToken(req: Request): string | null {
  const raw = req.header(AUTH_HEADER);
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]!.toLowerCase() !== "bearer") return null;
  const token = parts[1]!.trim();
  return token.length > 0 ? token : null;
}

/**
 * Decode JWT payload without verification (for diagnostic logging only).
 * Returns { aud, emailPresent, subPresent, issuer } or null. Never logs the token.
 */
function decodeJwtPayloadUnsafe(token: string): { aud?: string; emailPresent: boolean; subPresent: boolean; issuer?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = Buffer.from(payloadB64, "base64").toString("utf8");
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const aud = typeof payload.aud === "string" ? payload.aud : undefined;
    const issuer = typeof payload.iss === "string" ? payload.iss : undefined;
    const result: { aud?: string; emailPresent: boolean; subPresent: boolean; issuer?: string } = {
      emailPresent: typeof payload.email === "string" && payload.email.length > 0,
      subPresent: typeof payload.sub === "string" || typeof payload.sub === "number",
    };
    if (aud !== undefined) result.aud = aud;
    if (issuer !== undefined) result.issuer = issuer;
    return result;
  } catch {
    return null;
  }
}

type InvokerRejectExtra = {
  aud?: string | undefined;
  emailPresent?: boolean | undefined;
  subPresent?: boolean | undefined;
  sub?: string | undefined;
  issuer?: string | undefined;
  verifyReason?: string | undefined;
};

/** Log invoker auth rejection only (no success path). Never log token or Authorization. sub is safe to log (identifier). */
function logInvokerReject(req: Request, branch: string, errorCode: string, extra: InvokerRejectExtra = {}): void {
  const rid = (req as RequestWithRid).rid ?? "unknown";
  const host = req.header("host") ?? undefined;
  const payload: Record<string, unknown> = { msg: "invoker_auth_rejected", rid, branch, errorCode, host };
  if (extra.aud !== undefined) payload.aud = extra.aud;
  if (extra.emailPresent !== undefined) payload.emailPresent = extra.emailPresent;
  if (extra.subPresent !== undefined) payload.subPresent = extra.subPresent;
  if (extra.sub !== undefined) payload.sub = extra.sub;
  if (extra.issuer !== undefined) payload.issuer = extra.issuer;
  if (extra.verifyReason !== undefined) payload.verifyReason = extra.verifyReason;
  logger.info(payload);
}

function reject(
  res: Response,
  code: "INVOKER_AUTH_REQUIRED" | "INVOKER_ALLOWLIST_REQUIRED" | "INVOKER_FORBIDDEN" | "INVOKER_AUDIENCE_REQUIRED" | "INVOKER_TOKEN_INVALID",
  message: string,
): void {
  res.status(403).json({
    ok: false as const,
    error: { code, message },
  });
}

async function requireInvokerAuthAsync(req: Request, res: Response, next: NextFunction): Promise<void> {
  const headerRaw = req.header(HEADER_IDENTITY);
  const headerValue = typeof headerRaw === "string" ? headerRaw.trim() : "";

  if (headerValue) {
    const email = emailFromHeaderValue(headerValue);
    const allowed = getAllowedInvokerEmails();
    if (isProd() && allowed.size === 0) {
      logInvokerReject(req, "header_allowlist_empty", "INVOKER_ALLOWLIST_REQUIRED");
      reject(res, "INVOKER_ALLOWLIST_REQUIRED", "Invoker allowlist required in production (WITHINGS_PULL_INVOKER_EMAILS)");
      return;
    }
    if (allowed.size > 0 && !allowed.has(email.toLowerCase())) {
      logInvokerReject(req, "header_forbidden", "INVOKER_FORBIDDEN");
      reject(res, "INVOKER_FORBIDDEN", "Caller is not an allowed invoker");
      return;
    }
    next();
    return;
  }

  const bearerToken = extractBearerToken(req);
  if (!bearerToken) {
    logInvokerReject(req, "no_header_no_bearer", "INVOKER_AUTH_REQUIRED");
    reject(res, "INVOKER_AUTH_REQUIRED", "Invoker authentication required (X-Goog-Authenticated-User-Email or Authorization: Bearer <ID token>)");
    return;
  }

  const audience = getInvokerTokenAudience();
  if (isProd() && !audience) {
    const claims = decodeJwtPayloadUnsafe(bearerToken);
    logInvokerReject(req, "no_audience", "INVOKER_AUDIENCE_REQUIRED", {
      aud: claims?.aud,
      emailPresent: claims?.emailPresent,
      subPresent: claims?.subPresent,
      issuer: claims?.issuer,
    });
    reject(res, "INVOKER_AUDIENCE_REQUIRED", "Invoker token audience required in production (INVOKER_TOKEN_AUDIENCE)");
    return;
  }
  if (!audience) {
    const claims = decodeJwtPayloadUnsafe(bearerToken);
    logInvokerReject(req, "no_audience", "INVOKER_AUDIENCE_REQUIRED", {
      aud: claims?.aud,
      emailPresent: claims?.emailPresent,
      subPresent: claims?.subPresent,
      issuer: claims?.issuer,
    });
    reject(res, "INVOKER_AUDIENCE_REQUIRED", "INVOKER_TOKEN_AUDIENCE must be set to verify Bearer ID token");
    return;
  }

  try {
    const client = getOAuth2Client();
    const ticket = await client.verifyIdToken({ idToken: bearerToken, audience });
    const payload = ticket.getPayload();
    const email = typeof payload?.email === "string" ? payload.email.trim() : "";
    const sub = payload?.sub != null ? String(payload.sub) : "";

    const allowedEmails = getAllowedInvokerEmails();
    const allowedSubs = getAllowedInvokerSubs();
    const hasAllowlist = allowedEmails.size > 0 || allowedSubs.size > 0;

    if (isProd() && !hasAllowlist) {
      logInvokerReject(req, "token_allowlist_empty", "INVOKER_ALLOWLIST_REQUIRED");
      reject(res, "INVOKER_ALLOWLIST_REQUIRED", "Invoker allowlist required in production (WITHINGS_PULL_INVOKER_EMAILS or WITHINGS_PULL_INVOKER_SUBS)");
      return;
    }

    if (email) {
      if (allowedEmails.size > 0 && allowedEmails.has(email.toLowerCase())) {
        next();
        return;
      }
      if (allowedEmails.size > 0) {
        logInvokerReject(req, "email_forbidden", "INVOKER_FORBIDDEN");
        reject(res, "INVOKER_FORBIDDEN", "Caller is not an allowed invoker");
        return;
      }
    }

    if (sub && allowedSubs.size > 0 && allowedSubs.has(sub)) {
      next();
      return;
    }

    const claims = decodeJwtPayloadUnsafe(bearerToken);
    logInvokerReject(req, "token_identity_not_allowed", "INVOKER_TOKEN_INVALID", {
      aud: claims?.aud,
      emailPresent: !!email,
      subPresent: !!sub,
      sub: sub || undefined,
      issuer: claims?.issuer,
    });
    reject(res, "INVOKER_TOKEN_INVALID", "ID token must contain allowed email or sub claim");
  } catch (err) {
    const verifyReason = err instanceof Error ? err.message : String(err);
    const claims = decodeJwtPayloadUnsafe(bearerToken);
    logInvokerReject(req, "verify_failed", "INVOKER_TOKEN_INVALID", {
      aud: claims?.aud,
      emailPresent: claims?.emailPresent,
      subPresent: claims?.subPresent,
      issuer: claims?.issuer,
      verifyReason,
    });
    reject(res, "INVOKER_TOKEN_INVALID", "ID token verification failed");
  }
}

/** Express middleware: invoker via header OR Bearer ID token. Wraps async so Express waits. */
export function requireInvokerAuth(req: Request, res: Response, next: NextFunction): void {
  void Promise.resolve(requireInvokerAuthAsync(req, res, next)).catch(next);
}
