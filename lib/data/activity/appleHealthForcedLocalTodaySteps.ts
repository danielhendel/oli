/**
 * Activity guarantee: re-pull HealthKit + POST /ingest for the **current local calendar day**
 * when device step count is greater than persisted `dailyFacts.activity.steps`.
 *
 * Bug class fixed: the recovery path (Dash focus, weekly fitness) only repairs days where the
 * rawEvent doc is missing. Today's rawEvent doc already exists (created at app open with the
 * morning total), so the gap probe returns "no gaps" and never re-ingests today's growing total.
 * That left {@link DailyFacts.activity.steps} (and therefore Daily Energy NEAT) frozen at the
 * morning total even though Activity's live HealthKit card showed the current value.
 *
 * After a successful POST /ingest, the rawEvent UPDATE triggers
 * {@link onRawEventUpdatedForNormalization} → {@link recomputeDerivedTruthForDay} on the
 * backend. To let `useDailyFacts` subscribers refetch once the recompute lands, this helper
 * uses {@link scheduleDailyFactsInvalidationAfterIngest} (deferred client cache invalidation).
 */

import { Platform } from "react-native";

import { ingestRawEvent } from "@/lib/api/ingest";
import { getDailyFacts } from "@/lib/api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { scheduleDailyFactsInvalidationAfterIngest } from "@/lib/data/dailyFactsSessionCache";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { buildAppleHealthStepsIngestBody } from "@/lib/integrations/appleHealth/appleHealthStepsIngestBody";
import {
  getLocalCalendarDayBoundsFromYmd,
  pullStepCountForLocalCalendarDay,
  requestPermissions,
} from "@/lib/integrations/appleHealth/healthKit";
import { stepsIdempotencyKey } from "@/lib/integrations/appleHealth/idempotency";
import { getAppleHealthConnected, setLastIngestedStepsForDay } from "@/lib/integrations/appleHealth/storage";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

const DEV = typeof __DEV__ !== "undefined" && __DEV__ && !process.env.JEST_WORKER_ID;

function devLog(message: string, data: Record<string, unknown>): void {
  if (!DEV) return;
  // eslint-disable-next-line no-console
  console.log(`[AH:steps-today] ${message}`, data);
}

function roundSteps(n: number): number {
  return Math.round(n);
}

function stepsFromDailyFactsDto(d: DailyFactsDto): number | null {
  const s = d.activity?.steps;
  if (typeof s === "number" && Number.isFinite(s) && s >= 0) return roundSteps(s);
  return null;
}

async function fetchStoredStepsForDay(dayYmd: string, token: string): Promise<number | null> {
  const res = await getDailyFacts(dayYmd, token, { cacheBust: `compareToday:${Date.now()}` });
  const outcome = truthOutcomeFromApiResult(res);
  if (outcome.status !== "ready") return null;
  return stepsFromDailyFactsDto(outcome.data);
}

function getDeviceTimezoneIana(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export type RunForcedLocalTodayAppleHealthStepsIngestOpts = {
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  /**
   * Authenticated user uid. When provided and an ingest is posted, schedules a deferred
   * {@link invalidateDailyFactsSessionCache} so {@link useDailyFacts} subscribers refetch
   * after the backend recompute lands.
   */
  userUid?: string;
};

/**
 * Pulls Apple Health cumulative steps for **today** (device local calendar day) and compares to
 * `GET /users/me/daily-facts.activity.steps`. POSTs ingest when HK > stored (or stored is missing),
 * letting the backend re-run normalization + recompute. Skips when stored already matches HK.
 *
 * Unlike {@link runForcedLocalYesterdayAppleHealthStepsIngest} this does **not** poll dailyFacts
 * (today keeps growing); it instead schedules deferred client cache invalidation so subscribers
 * (e.g. Daily Energy NEAT) refetch after the recompute settles.
 */
export async function runForcedLocalTodayAppleHealthStepsIngest(
  opts: RunForcedLocalTodayAppleHealthStepsIngestOpts,
): Promise<void> {
  if (Platform.OS !== "ios") return;

  const connected = await getAppleHealthConnected().catch(() => false);
  if (!connected) {
    devLog("skip: not connected", {});
    return;
  }

  const token = await opts.getIdToken(false);
  if (!token) {
    devLog("skip: no token", {});
    return;
  }

  const todayKey = getTodayDayKeyLocal();

  const perm = await requestPermissions();
  if (!perm.ok) {
    devLog("skip: no permissions", { hasDayKey: Boolean(todayKey) });
    return;
  }

  const pulled = await pullStepCountForLocalCalendarDay(todayKey);
  if (!pulled.ok) {
    devLog("skip: hk pull failed", { hasError: Boolean(pulled.error) });
    return;
  }

  const hkStepsRounded = roundSteps(pulled.steps);
  const storedSteps = await fetchStoredStepsForDay(todayKey, token);

  devLog("hk vs stored", {
    hasHkSteps: true,
    hasStoredSteps: storedSteps !== null,
    stepsMatch: storedSteps === null ? null : storedSteps === hkStepsRounded,
    hkEmpty: pulled.hkEmpty === true,
  });

  /** Only post when HK is strictly greater than stored (or stored is missing). HK ≤ stored
   * indicates HK is partial/transient or already matches; either way no ingest is needed. */
  if (storedSteps !== null && hkStepsRounded <= storedSteps) {
    await setLastIngestedStepsForDay(todayKey, hkStepsRounded);
    return;
  }

  const timezone = getDeviceTimezoneIana();
  const { start, end } = getLocalCalendarDayBoundsFromYmd(todayKey);
  const body = buildAppleHealthStepsIngestBody({
    start,
    end,
    day: todayKey,
    timezone,
    steps: pulled.steps,
  });
  const idempotencyKey = stepsIdempotencyKey(todayKey);

  devLog("post /ingest", {
    hasIdempotencyKey: Boolean(idempotencyKey),
    hasPayloadSteps: typeof body.payload.steps === "number",
    hasPayloadStart: Boolean(body.payload.start),
    hasPayloadTimezone: Boolean(body.payload.timezone),
  });

  const res = await ingestRawEvent(body, token, {
    idempotencyKey,
    timeoutMs: 15000,
  });

  devLog("ingest response", {
    ok: res.ok,
    status: res.status,
    ...(res.ok ? {} : { hasError: Boolean(res.error), hasRequestId: Boolean(res.requestId) }),
  });

  if (!res.ok) return;

  await setLastIngestedStepsForDay(todayKey, hkStepsRounded);

  /** Defer cache invalidation so subscribers refetch only after the backend recompute settles
   * (rawEvent UPDATE → onRawEventUpdatedForNormalization → recomputeDerivedTruthForDay). */
  if (typeof opts.userUid === "string" && opts.userUid.length > 0) {
    scheduleDailyFactsInvalidationAfterIngest({ userUid: opts.userUid, day: todayKey });
  }
}
