import { postOuraSleepDayRefresh } from "@/lib/api/ouraSleepDayRefresh";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

export type SleepTodayRecoveryDeps = {
  /** UID of the signed-in user. Recovery is per-uid:day rate-limited. */
  uid: string;
  /** The day the UI is rendering. Recovery is a no-op unless this equals "today". */
  requestedDay: string;
  /** True when the canonical SleepNight VM is settled and has no attributed sleep for the requested day. */
  isMissing: boolean;
  /** Override for tests. Defaults to local-device today. */
  todayDayKey?: string;
  /**
   * Rate-limit window per uid:day. Defaults to 60s — long enough to avoid
   * loops, short enough that a fresh app open after a slow Oura publish can
   * still self-heal within the user's visible session.
   */
  rateLimitMs?: number;
  /** Test seam: defaults to Date.now. */
  now?: () => number;
  /** Auth token getter (same signature as AuthProvider.getIdToken). */
  getIdToken: (forceRefresh: boolean) => Promise<string | null>;
  /** Canonical SleepNight refetch (typically useSleepNight.refetch). */
  refetchSleep: (opts?: TruthGetOptions) => void | Promise<void>;
};

export type SleepTodayRecoveryOutcome = {
  /** True when this call hit the canonical refresh + refetch path. */
  ran: boolean;
  /** Diagnostic reason when skipped (or "ok" when ran). */
  reason:
    | "ok"
    | "no_uid"
    | "not_today"
    | "not_missing"
    | "rate_limited"
    | "no_token"
    | "refresh_failed";
};

/**
 * Module-level rate-limit ledger. Key = `${uid}:${day}` → last attempt epoch ms.
 * Module scope is intentional: it survives hook re-mounts (e.g. focus changes)
 * so the same screen re-render cannot duplicate work.
 */
const lastAttemptByUidDay = new Map<string, number>();

/** Test-only reset. Never imported by app code. */
export function __resetSleepTodayRecoveryLedgerForTests(): void {
  lastAttemptByUidDay.clear();
}

const DEFAULT_RATE_LIMIT_MS = 60_000;

/**
 * Shared "today is missing → run the canonical refresh path once, then refetch
 * the canonical SleepNight view" coordinator.
 *
 * Reuses the existing canonical write path
 *   POST /integrations/oura/sleep-day-refresh
 *     → performOuraPullNowCore (Oura pull → rawEvents → ouraVendorSleep
 *       → sleepNights/{anchorDay})
 *     → recomputeDerivedTruthForDay
 *
 * This helper is a recovery coordinator only:
 *   - It never reads or writes Firestore directly.
 *   - It never creates a parallel ingestion path.
 *   - It refuses to fire for historical days (`requestedDay !== today`).
 *   - It rate-limits per uid:day so transient missing states cannot loop.
 */
export async function runSleepTodayRecoveryIfMissing(
  deps: SleepTodayRecoveryDeps,
): Promise<SleepTodayRecoveryOutcome> {
  const today = deps.todayDayKey ?? getTodayDayKeyLocal();
  const now = (deps.now ?? Date.now)();
  const rateLimitMs = deps.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;

  if (!deps.uid) return { ran: false, reason: "no_uid" };
  if (deps.requestedDay !== today) return { ran: false, reason: "not_today" };
  if (!deps.isMissing) return { ran: false, reason: "not_missing" };

  const ledgerKey = `${deps.uid}:${today}`;
  const last = lastAttemptByUidDay.get(ledgerKey);
  if (last !== undefined && now - last < rateLimitMs) {
    return { ran: false, reason: "rate_limited" };
  }
  lastAttemptByUidDay.set(ledgerKey, now);

  const token = await deps.getIdToken(false);
  if (!token) return { ran: false, reason: "no_token" };

  const idem = `sleep-today-recovery:${today}:${now}`;
  let refreshRes: Awaited<ReturnType<typeof postOuraSleepDayRefresh>>;
  try {
    refreshRes = await postOuraSleepDayRefresh(
      token,
      { day: today },
      { idempotencyKey: idem, timeoutMs: 120_000, noStore: true },
    );
  } catch {
    return { ran: false, reason: "refresh_failed" };
  }

  if (!refreshRes.ok) {
    return { ran: false, reason: "refresh_failed" };
  }

  await deps.refetchSleep({ cacheBust: `sleep:today-recovery:${now}` });
  return { ran: true, reason: "ok" };
}
