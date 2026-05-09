import { shouldIngestAppleHealthStepsForDay } from "./appleHealthStepsIngestGuard";
import { buildAppleHealthStepsIngestBody } from "./appleHealthStepsIngestBody";
import { getLastIngestedStepsForDay, setLastIngestedStepsForDay } from "./storage";
import { addLocalCalendarDaysToDayKey, getLocalCalendarDayBoundsFromYmd } from "./healthKit";

const DEV_LOG_ENABLED = typeof __DEV__ !== "undefined" && __DEV__ && !process.env.JEST_WORKER_ID;

function devLog(message: string, data: Record<string, unknown>): void {
  if (!DEV_LOG_ENABLED) return;
  // eslint-disable-next-line no-console
  console.log(`[AH:steps-backfill] ${message}`, data);
}
import type {
  AppleHealthStepsBackfillState,
  AppleHealthStepsRepairTriggerSource,
} from "./storage";

/** Default steps backfill: trailing local calendar days ending on the device “today” day key (inclusive). */
export const APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS = 365;

export type RunAppleHealthStepsBackfillDeps = {
  nowIso: () => string;
  getTodayDayKeyLocal: () => string;
  getDeviceTimezone: () => string;
  /** HealthKit step query for one local calendar day (inject for tests). */
  pullStepCountForLocalCalendarDay: (
    dayYmd: string,
  ) => Promise<
    { ok: true; steps: number; hkEmpty?: true } | { ok: false; error: string }
  >;
  ingestRawEvent: (
    body: unknown,
    token: string,
    opts: { idempotencyKey: string; timeoutMs: number },
  ) => Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }>;
  stepsIdempotencyKey: (day: string) => string;
  getBackfillState: () => Promise<AppleHealthStepsBackfillState | null>;
  setBackfillState: (state: AppleHealthStepsBackfillState) => Promise<void>;
};

export type RunAppleHealthStepsBackfillResult =
  | {
      ok: true;
      startedAt: string;
      completedAt: string;
      lookbackDays: number;
      windowStartDay: string;
      windowEndDay: string;
      daysTotal: number;
      daysProcessed: number;
      daysIngested: number;
      daysSkippedNoData: number;
      daysFailed: number;
      lastSuccessfulDay: string | null;
      triggerSource: AppleHealthStepsRepairTriggerSource | null;
    }
  | { ok: false; error: string; requestId: string | null };

/** Invariant: one local calendar day string drives idempotency key, payload.day, and HK bounds. */
export function assertStepsBackfillSingleDayInvariant(params: {
  day: string;
  idempotencyKey: string;
  payloadDay: string;
}): void {
  if (params.day !== params.payloadDay) {
    throw new Error(
      `steps backfill invariant: loop day ${params.day} !== payload.day ${params.payloadDay}`,
    );
  }
  if (!params.idempotencyKey.endsWith(params.day)) {
    throw new Error(
      `steps backfill invariant: idempotencyKey ${params.idempotencyKey} does not end with day ${params.day}`,
    );
  }
}

function enumerateLocalDayWindow(endDay: string, lookbackDays: number): string[] {
  const n = Math.max(1, lookbackDays);
  const startDay = addLocalCalendarDaysToDayKey(endDay, -(n - 1));
  const out: string[] = [];
  let cur = startDay;
  while (cur <= endDay) {
    out.push(cur);
    cur = addLocalCalendarDaysToDayKey(cur, 1);
  }
  return out;
}

/**
 * Replay Apple Health step totals per local calendar day through POST /ingest.
 * Uses the same idempotency keys as anchored sync so replays update `receivedAt` and re-trigger normalization.
 */
export async function runAppleHealthStepsBackfill(
  opts: {
    token: string;
    forceRestart?: boolean;
    lookbackDays?: number;
    /** Persisted on state for UI/diagnostics; defaults to last known or null. */
    triggerSource?: AppleHealthStepsRepairTriggerSource | null;
  },
  deps: RunAppleHealthStepsBackfillDeps,
): Promise<RunAppleHealthStepsBackfillResult> {
  const now = deps.nowIso();
  const lookbackDays = Math.max(1, opts.lookbackDays ?? APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS);
  const windowEndDay = deps.getTodayDayKeyLocal();
  const windowStartDay = addLocalCalendarDaysToDayKey(windowEndDay, -(lookbackDays - 1));
  const days = enumerateLocalDayWindow(windowEndDay, lookbackDays);
  const existing = await deps.getBackfillState();

  const resumeInProgress = !opts.forceRestart && existing?.status === "in_progress";
  const startedAt = resumeInProgress ? existing!.summary.startedAt : now;

  const triggerSource: AppleHealthStepsRepairTriggerSource | null =
    opts.triggerSource !== undefined && opts.triggerSource !== null
      ? opts.triggerSource
      : (existing?.lastTriggerSource ?? null);

  let startIndex = 0;
  if (resumeInProgress && existing!.lastProcessedDay) {
    const resumeFrom = addLocalCalendarDaysToDayKey(existing!.lastProcessedDay, 1);
    const idx = days.findIndex((d) => d >= resumeFrom);
    startIndex = idx < 0 ? days.length : idx;
  }

  let daysProcessed = resumeInProgress ? existing!.summary.daysProcessed : 0;
  let daysIngested = resumeInProgress ? existing!.summary.daysIngested : 0;
  let daysSkippedNoData = resumeInProgress ? existing!.summary.daysSkippedNoData : 0;
  let lastSuccessfulDay: string | null =
    resumeInProgress && existing!.summary.lastSuccessfulDay != null
      ? existing!.summary.lastSuccessfulDay
      : null;

  const timezone = deps.getDeviceTimezone();

  await deps.setBackfillState({
    status: "in_progress",
    backfillStartDate: startedAt,
    windowStartDay,
    windowEndDay,
    lookbackDays,
    lastProcessedDay: startIndex > 0 && startIndex <= days.length ? days[startIndex - 1]! : null,
    lastRunAt: now,
    error: null,
    lastTriggerSource: triggerSource,
    summary: {
      startedAt,
      completedAt: null,
      daysTotal: days.length,
      daysProcessed,
      daysIngested,
      daysSkippedNoData,
      daysFailed: 0,
      lastSuccessfulDay,
      lastProcessedDay: startIndex > 0 && startIndex <= days.length ? days[startIndex - 1]! : null,
    },
  });

  for (let i = startIndex; i < days.length; i += 1) {
    const day = days[i]!;
    const pulled = await deps.pullStepCountForLocalCalendarDay(day);
    if (!pulled.ok) {
      await deps.setBackfillState({
        status: "failed",
        backfillStartDate: startedAt,
        windowStartDay,
        windowEndDay,
        lookbackDays,
        lastProcessedDay: day,
        lastRunAt: deps.nowIso(),
        error: pulled.error,
        lastTriggerSource: triggerSource,
        summary: {
          startedAt,
          completedAt: null,
          daysTotal: days.length,
          daysProcessed,
          daysIngested,
          daysSkippedNoData,
          daysFailed: 1,
          lastSuccessfulDay,
          lastProcessedDay: day,
        },
      });
      return { ok: false, error: pulled.error, requestId: null };
    }

    daysProcessed += 1;

    if (pulled.hkEmpty) {
      daysSkippedNoData += 1;
    }

    const lastIngested = await getLastIngestedStepsForDay(day);
    const sendSteps = shouldIngestAppleHealthStepsForDay({
      healthSteps: pulled.steps,
      hkEmpty: pulled.hkEmpty === true,
      lastIngestedSteps: lastIngested,
    });

    if (sendSteps) {
      const { start, end } = getLocalCalendarDayBoundsFromYmd(day);
      const body = buildAppleHealthStepsIngestBody({
        start,
        end,
        day,
        timezone,
        steps: pulled.steps,
      });
      const idempotencyKey = deps.stepsIdempotencyKey(day);
      assertStepsBackfillSingleDayInvariant({
        day,
        idempotencyKey,
        payloadDay: body.payload.day,
      });
      devLog("post /ingest", {
        day,
        idempotencyKey,
        hkSteps: pulled.steps,
        payloadSteps: body.payload.steps,
        payloadStart: body.payload.start,
        payloadTimezone: body.payload.timezone,
        lastIngested,
      });
      const res = await deps.ingestRawEvent(body, opts.token, {
        idempotencyKey,
        timeoutMs: 15000,
      });
      devLog("ingest response", {
        day,
        idempotencyKey,
        ok: res.ok,
        ...(res.ok ? {} : { error: res.error, requestId: res.requestId }),
      });
      if (!res.ok) {
        await deps.setBackfillState({
          status: "failed",
          backfillStartDate: startedAt,
          windowStartDay,
          windowEndDay,
          lookbackDays,
          lastProcessedDay: day,
          lastRunAt: deps.nowIso(),
          error: res.error,
          lastTriggerSource: triggerSource,
          summary: {
            startedAt,
            completedAt: null,
            daysTotal: days.length,
            daysProcessed,
            daysIngested,
            daysSkippedNoData,
            daysFailed: 1,
            lastSuccessfulDay,
            lastProcessedDay: day,
          },
        });
        return { ok: false, error: res.error, requestId: res.requestId };
      }
      await setLastIngestedStepsForDay(day, pulled.steps);
      daysIngested += 1;
      lastSuccessfulDay = day;
    }

    await deps.setBackfillState({
      status: "in_progress",
      backfillStartDate: startedAt,
      windowStartDay,
      windowEndDay,
      lookbackDays,
      lastProcessedDay: day,
      lastRunAt: deps.nowIso(),
      error: null,
      lastTriggerSource: triggerSource,
      summary: {
        startedAt,
        completedAt: null,
        daysTotal: days.length,
        daysProcessed,
        daysIngested,
        daysSkippedNoData,
        daysFailed: 0,
        lastSuccessfulDay,
        lastProcessedDay: day,
      },
    });
  }

  const completedAt = deps.nowIso();
  await deps.setBackfillState({
    status: "completed",
    backfillStartDate: startedAt,
    windowStartDay,
    windowEndDay,
    lookbackDays,
    lastProcessedDay: days.length > 0 ? days[days.length - 1]! : null,
    lastRunAt: completedAt,
    error: null,
    lastTriggerSource: triggerSource,
    summary: {
      startedAt,
      completedAt,
      daysTotal: days.length,
      daysProcessed,
      daysIngested,
      daysSkippedNoData,
      daysFailed: 0,
      lastSuccessfulDay,
      lastProcessedDay: days.length > 0 ? days[days.length - 1]! : null,
    },
  });

  return {
    ok: true,
    startedAt,
    completedAt,
    lookbackDays,
    windowStartDay,
    windowEndDay,
    daysTotal: days.length,
    daysProcessed,
    daysIngested,
    daysSkippedNoData,
    daysFailed: 0,
    lastSuccessfulDay,
    triggerSource,
  };
}
