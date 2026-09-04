/**
 * Server-enforced recent authentication for account deletion (ADR v1).
 * Uses verified Firebase ID token auth_time only — never client claims.
 */

import { DELETE_RECENT_AUTH_MAX_AGE_SECONDS } from "@oli/contracts";

export type RecentAuthCheckResult =
  | { ok: true }
  | { ok: false; reason: "missing_auth_time" | "stale_auth_time" };

/**
 * @param authTimeSeconds - Verified token `auth_time` (seconds since epoch), or undefined if absent
 * @param nowSeconds - Server now (seconds); injectable for tests
 * @param maxAgeSeconds - Allowed age; defaults to ADR bound
 */
export function checkRecentAuthForDeletion(
  authTimeSeconds: number | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  maxAgeSeconds: number = DELETE_RECENT_AUTH_MAX_AGE_SECONDS,
): RecentAuthCheckResult {
  if (typeof authTimeSeconds !== "number" || !Number.isFinite(authTimeSeconds)) {
    return { ok: false, reason: "missing_auth_time" };
  }
  const age = nowSeconds - authTimeSeconds;
  if (age < 0 || age > maxAgeSeconds) {
    return { ok: false, reason: "stale_auth_time" };
  }
  return { ok: true };
}
