/**
 * Single-flight Oura OAuth token refresh per uid.
 *
 * Why: Oura refresh tokens are single-use. Two concurrent callers (manual pull,
 * sleep-day-refresh recovery, scheduled pull) holding the same refresh token
 * race: only one succeeds; the other receives `invalid_grant` and (under the
 * previous cleanup path) destroyed token custody — even though the winner had
 * just stored a valid new refresh token. This made all subsequent Oura pulls
 * return 502 OURA_NOT_CONNECTED until the user reconnected.
 *
 * Design:
 * - Process-local in-flight Map collapses same-instance concurrent callers to
 *   a single `refreshOuraAccessToken` call; followers join the winner's promise.
 * - Firestore lease at `users/{uid}/integrationLocks/ouraTokenRefresh` serializes
 *   across Cloud Run instances and survives a single-instance crash via TTL.
 *
 * The lease wraps ONLY the token rotation step (read refresh token → refresh →
 * store new refresh token). The downstream fetch + materialization run outside
 * the lease so different uids remain fully independent.
 *
 * On invalid_grant: re-read the stored refresh token; only delete custody if it
 * still matches the token this request attempted. If a concurrent winner already
 * rotated it, treat as concurrent success and skip cleanup.
 */

import { FieldValue, db, userCollection } from "../db";
import { logOuraRefreshTelemetry } from "./ouraRefreshTelemetry";
import * as ouraSecrets from "./ouraSecrets";
import { OuraApiError, refreshOuraAccessToken, type OuraTokenResult } from "./ouraApi";

const LOCK_DOC_ID = "ouraTokenRefresh";
const LOCK_PURPOSE = "oura_token_refresh" as const;

/** TTL for the Firestore lease — long enough for a refresh round trip; short enough to recover from crashes. */
const DEFAULT_LOCK_TTL_MS = 90_000;
/** Max time a waiting caller will spend trying to acquire the lock before giving up. */
const DEFAULT_WAIT_BUDGET_MS = 8_000;
/** Base poll interval; jittered up to BASE + JITTER per attempt. */
const DEFAULT_POLL_BASE_MS = 150;
const DEFAULT_POLL_JITTER_MS = 200;

export type OuraTokenRefreshOutcome =
  | { kind: "refreshed"; tokens: OuraTokenResult; rotated: true }
  | { kind: "invalid_grant"; cleanedUp: boolean }
  | { kind: "lock_unavailable"; waitedMs: number }
  | { kind: "no_refresh_token" };

export type LockHandle = {
  readonly owner: string;
  readonly stolen: boolean;
  release(): Promise<void>;
};

export type LockBackend = {
  acquire(args: {
    uid: string;
    owner: string;
    ttlMs: number;
    waitBudgetMs: number;
    pollBaseMs: number;
    pollJitterMs: number;
    onWait?: (waitedMs: number) => void;
  }): Promise<LockHandle | { acquired: false; waitedMs: number }>;
};

export type RefreshDeps = {
  /** Override for tests; defaults to firestoreLockBackend. */
  lockBackend?: LockBackend;
  /** Override TTL for tests. */
  lockTtlMs?: number;
  /** Override wait budget for tests. */
  waitBudgetMs?: number;
};

export type RefreshArgs = {
  uid: string;
  requestId: string;
  clientId: string;
  clientSecret: string;
  /**
   * Called when refresh returns invalid_grant AND the stored refresh token
   * still equals the one this request attempted (no concurrent rotation).
   * Caller owns the user-visible cleanup (delete custody + Firestore state).
   */
  performReconnectCleanup: (uid: string, requestId: string) => Promise<void>;
};

function lockDocRef(uid: string) {
  return userCollection(uid, "integrationLocks").doc(LOCK_DOC_ID);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextPollDelay(base: number, jitter: number): number {
  return base + Math.floor(Math.random() * Math.max(jitter, 1));
}

/** Default Firestore-backed lock. Single-doc lease per uid with TTL + atomic steal. */
export const firestoreLockBackend: LockBackend = {
  async acquire({ uid, owner, ttlMs, waitBudgetMs, pollBaseMs, pollJitterMs, onWait }) {
    const ref = lockDocRef(uid);
    const start = Date.now();

    while (true) {
      const acquireResult = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();
        const expiresAtMs = now + ttlMs;
        if (!snap.exists) {
          tx.set(ref, {
            owner,
            purpose: LOCK_PURPOSE,
            acquiredAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            expiresAtMs,
          });
          return { acquired: true as const, stolen: false };
        }
        const data = snap.data() as { owner?: unknown; expiresAtMs?: unknown } | undefined;
        const currentExpires =
          typeof data?.expiresAtMs === "number" ? (data.expiresAtMs as number) : 0;
        const currentOwner = typeof data?.owner === "string" ? data.owner : null;
        if (currentExpires > now && currentOwner !== owner) {
          return { acquired: false as const };
        }
        tx.set(ref, {
          owner,
          purpose: LOCK_PURPOSE,
          acquiredAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          expiresAtMs,
        });
        return { acquired: true as const, stolen: currentExpires <= now };
      });

      if (acquireResult.acquired) {
        const handle: LockHandle = {
          owner,
          stolen: acquireResult.stolen,
          async release() {
            try {
              await db.runTransaction(async (tx) => {
                const snap = await tx.get(ref);
                if (!snap.exists) return;
                const data = snap.data() as { owner?: unknown } | undefined;
                if (data?.owner !== owner) return;
                tx.delete(ref);
              });
            } catch {
              // best-effort
            }
          },
        };
        return handle;
      }

      const waited = Date.now() - start;
      if (waited >= waitBudgetMs) {
        return { acquired: false, waitedMs: waited };
      }
      onWait?.(waited);
      await sleep(nextPollDelay(pollBaseMs, pollJitterMs));
    }
  },
};

const inFlight = new Map<string, Promise<OuraTokenRefreshOutcome>>();
let activeBackend: LockBackend = firestoreLockBackend;

/** Test-only: override the lock backend (and current in-flight state). */
export function __setLockBackendForTests(backend: LockBackend): void {
  activeBackend = backend;
}

/** Test-only: restore the production Firestore backend. */
export function __resetLockBackendForTests(): void {
  activeBackend = firestoreLockBackend;
  inFlight.clear();
}

/**
 * Acquire the single-flight slot, refresh and rotate the Oura refresh token,
 * and return the outcome. Within one process, concurrent callers join the same
 * pending promise. Across Cloud Run instances, the Firestore lease serializes
 * the actual refresh.
 */
export function refreshOuraTokenSingleFlight(
  args: RefreshArgs,
  deps: RefreshDeps = {},
): Promise<OuraTokenRefreshOutcome> {
  const existing = inFlight.get(args.uid);
  if (existing) {
    logOuraRefreshTelemetry({
      operation: "oura_token_refresh_in_flight_join",
      requestId: args.requestId,
    });
    return existing;
  }

  const lockTtlMs = deps.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
  const waitBudgetMs = deps.waitBudgetMs ?? DEFAULT_WAIT_BUDGET_MS;
  const backend = deps.lockBackend ?? activeBackend;

  const pendingResolved: Promise<OuraTokenRefreshOutcome> = runRefresh(
    args,
    backend,
    lockTtlMs,
    waitBudgetMs,
  ).finally(() => {
    if (inFlight.get(args.uid) === pendingResolved) {
      inFlight.delete(args.uid);
    }
  });
  inFlight.set(args.uid, pendingResolved);
  return pendingResolved;
}

async function runRefresh(
  args: RefreshArgs,
  backend: LockBackend,
  lockTtlMs: number,
  waitBudgetMs: number,
): Promise<OuraTokenRefreshOutcome> {
  const { uid, requestId, clientId, clientSecret, performReconnectCleanup } = args;

  const acquired = await backend.acquire({
    uid,
    owner: requestId,
    ttlMs: lockTtlMs,
    waitBudgetMs,
    pollBaseMs: DEFAULT_POLL_BASE_MS,
    pollJitterMs: DEFAULT_POLL_JITTER_MS,
    onWait: (waitedMs) => {
      logOuraRefreshTelemetry({ operation: "oura_token_refresh_lock_wait", requestId });
    },
  });

  if (!("release" in acquired)) {
    logOuraRefreshTelemetry({
      operation: "oura_token_refresh_lock_unavailable",
      requestId,
    });
    return { kind: "lock_unavailable", waitedMs: acquired.waitedMs };
  }

  if (acquired.stolen) {
    logOuraRefreshTelemetry({ operation: "oura_token_refresh_lock_stolen", requestId });
  } else {
    logOuraRefreshTelemetry({ operation: "oura_token_refresh_lock_acquired", requestId });
  }

  try {
    const attemptedToken = await ouraSecrets.getRefreshToken(uid);
    if (!attemptedToken) {
      return { kind: "no_refresh_token" };
    }

    let tokens: OuraTokenResult;
    try {
      tokens = await refreshOuraAccessToken(attemptedToken, clientId, clientSecret);
    } catch (err) {
      const isUnauth =
        err instanceof OuraApiError &&
        (err.status === 401 || err.code === "OURA_TOKEN_REFRESH_FAILED");
      if (!isUnauth) throw err;

      const currentToken = await ouraSecrets.getRefreshToken(uid);
      if (currentToken && currentToken !== attemptedToken) {
        logOuraRefreshTelemetry({
          operation: "oura_token_refresh_concurrent_success_detected",
          requestId,
        });
        return { kind: "invalid_grant", cleanedUp: false };
      }

      logOuraRefreshTelemetry({ operation: "oura_token_refresh_invalid_grant_cleanup", requestId });
      await performReconnectCleanup(uid, requestId);
      return { kind: "invalid_grant", cleanedUp: true };
    }

    await ouraSecrets.setRefreshToken(uid, tokens.refresh_token);
    return { kind: "refreshed", tokens, rotated: true };
  } finally {
    await acquired.release();
    logOuraRefreshTelemetry({ operation: "oura_token_refresh_lock_released", requestId });
  }
}
