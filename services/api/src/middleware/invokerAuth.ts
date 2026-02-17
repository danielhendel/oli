/**
 * Phase 3B — Invoker-only protection for scheduled/job endpoints.
 * Cloud Run sets X-Goog-Authenticated-User-Email when the request is authenticated via IAM.
 * Fail-closed:
 * - missing header => 403
 * - production requires explicit allowlist => 403 if unset
 * - if allowlist set, caller must match => 403
 */

import type { Request, Response, NextFunction } from "express";

const HEADER = "x-goog-authenticated-user-email";

/**
 * Returns comma-separated list of allowed invoker emails (service accounts).
 * Example: WITHINGS_PULL_INVOKER_EMAILS=oli-scheduler@project.iam.gserviceaccount.com
 */
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

function isProd(): boolean {
  return (process.env.NODE_ENV ?? "").toLowerCase() === "production";
}

export function requireInvokerAuth(req: Request, res: Response, next: NextFunction): void {
  const raw = req.header(HEADER);
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) {
    res.status(403).json({
      ok: false as const,
      error: {
        code: "INVOKER_AUTH_REQUIRED" as const,
        message: "Invoker authentication required (X-Goog-Authenticated-User-Email)",
      },
    });
    return;
  }

  // Cloud Run may prefix with "accounts.google.com:"
  const email = value.includes(":") ? value.split(":")[1]?.trim() ?? value : value;

  const allowed = getAllowedInvokerEmails();

  // Constitution: fail-closed in production; do not accept any arbitrary header value.
  if (isProd() && allowed.size === 0) {
    res.status(403).json({
      ok: false as const,
      error: {
        code: "INVOKER_ALLOWLIST_REQUIRED" as const,
        message: "Invoker allowlist required in production (WITHINGS_PULL_INVOKER_EMAILS)",
      },
    });
    return;
  }

  if (allowed.size > 0 && !allowed.has(email.toLowerCase())) {
    res.status(403).json({
      ok: false as const,
      error: {
        code: "INVOKER_FORBIDDEN" as const,
        message: "Caller is not an allowed invoker",
      },
    });
    return;
  }

  next();
}
