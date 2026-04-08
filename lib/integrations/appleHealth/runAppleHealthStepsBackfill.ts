import { buildAppleHealthStepsIngestBody } from "./appleHealthStepsIngestBody";
import { addLocalCalendarDaysToDayKey, getLocalCalendarDayBoundsFromYmd } from "./healthKit";
import type { AppleHealthStepsBackfillState } from "./storage";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inclusive count of local calendar days from Jan 1 of `todayYmd`'s year through `todayYmd`
 * (used as the default steps backfill window = year-to-date).
 */
export function computeLocalYtdLookbackDays(todayYmd: string): number {
  if (!DAY_KEY_RE.test(todayYmd)) {
    throw new Error(`computeLocalYtdLookbackDays: invalid day "${todayYmd}"`);
  }
  const year = todayYmd.slice(0, 4);
  const jan1 = `${year}-01-01`;
  let count = 0;
  let d = jan1;
  while (d <= todayYmd) {
    count += 1;
    d = addLocalCalendarDaysToDayKey(d, 1);
  }
  return Math.max(1, count);
}

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
    }
  | { ok: false; error: string; requestId: string | null };

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
  },
  deps: RunAppleHealthStepsBackfillDeps,
): Promise<RunAppleHealthStepsBackfillResult> {
  const now = deps.nowIso();
  const lookbackDays = Math.max(
    1,
    opts.lookbackDays ?? computeLocalYtdLookbackDays(deps.getTodayDayKeyLocal()),
  );
  const windowEndDay = deps.getTodayDayKeyLocal();
  const windowStartDay = addLocalCalendarDaysToDayKey(windowEndDay, -(lookbackDays - 1));
  const days = enumerateLocalDayWindow(windowEndDay, lookbackDays);
  const existing = await deps.getBackfillState();

  const resumeInProgress = !opts.forceRestart && existing?.status === "in_progress";
  const startedAt = resumeInProgress ? existing!.summary.startedAt : now;

  let startIndex = 0;
  if (resumeInProgress && existing!.lastProcessedDay) {
    const resumeFrom = addLocalCalendarDaysToDayKey(existing!.lastProcessedDay, 1);
    const idx = days.findIndex((d) => d >= resumeFrom);
    startIndex = idx < 0 ? days.length : idx;
  }

  let daysProcessed = resumeInProgress ? existing!.summary.daysProcessed : 0;
  let daysIngested = resumeInProgress ? existing!.summary.daysIngested : 0;
  let daysSkippedNoData = resumeInProgress ? existing!.summary.daysSkippedNoData : 0;

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
    summary: {
      startedAt,
      completedAt: null,
      daysTotal: days.length,
      daysProcessed,
      daysIngested,
      daysSkippedNoData,
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
        summary: {
          startedAt,
          completedAt: null,
          daysTotal: days.length,
          daysProcessed,
          daysIngested,
          daysSkippedNoData,
          lastProcessedDay: day,
        },
      });
      return { ok: false, error: pulled.error, requestId: null };
    }

    daysProcessed += 1;

    if (pulled.hkEmpty) {
      daysSkippedNoData += 1;
    }

    const { start, end } = getLocalCalendarDayBoundsFromYmd(day);
    const body = buildAppleHealthStepsIngestBody({
      start,
      end,
      day,
      timezone,
      steps: pulled.steps,
    });
    const res = await deps.ingestRawEvent(body, opts.token, {
      idempotencyKey: deps.stepsIdempotencyKey(day),
      timeoutMs: 15000,
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
        summary: {
          startedAt,
          completedAt: null,
          daysTotal: days.length,
          daysProcessed,
          daysIngested,
          daysSkippedNoData,
          lastProcessedDay: day,
        },
      });
      return { ok: false, error: res.error, requestId: res.requestId };
    }
    daysIngested += 1;

    await deps.setBackfillState({
      status: "in_progress",
      backfillStartDate: startedAt,
      windowStartDay,
      windowEndDay,
      lookbackDays,
      lastProcessedDay: day,
      lastRunAt: deps.nowIso(),
      error: null,
      summary: {
        startedAt,
        completedAt: null,
        daysTotal: days.length,
        daysProcessed,
        daysIngested,
        daysSkippedNoData,
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
    summary: {
      startedAt,
      completedAt,
      daysTotal: days.length,
      daysProcessed,
      daysIngested,
      daysSkippedNoData,
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
  };
}
