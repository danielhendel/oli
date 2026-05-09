/**
 * Locks in the auto-repair coordinator's post-ingest invalidation contract:
 * after a successful Apple Health steps backfill that includes today, it must
 * schedule a deferred {@link invalidateDailyFactsSessionCache} for `today` so
 * Dash Daily Energy refetches the persisted `dailyFacts.energy.factors.steps`
 * once the backend recompute settles.
 */
import { jest } from "@jest/globals";

// scripts/test/jest.setup.ts globally mocks this coordinator to a no-op (so other tests
// don't accidentally fire the auto-repair). This file exercises the real implementation,
// so we unmock it explicitly.
jest.unmock("@/lib/data/activity/appleHealthStepsRepairCoordinator");

// Variable names must begin with `mock` so jest.mock factories can reference
// them despite hoisting (see jest.mock factory variable rules).
const mockIngestRawEvent = jest.fn();
const mockPullStepsForDay = jest.fn();
const mockRequestPermissions = jest.fn(async () => ({ ok: true as const }));
const mockGetAppleHealthConnected = jest.fn(async () => true);
const mockGetBackfillState = jest.fn(async () => null);
const mockSetBackfillState = jest.fn(async () => undefined);
const mockGetAutoRepairLastCompletedAt = jest.fn(async () => null);
const mockSetAutoRepairLastCompletedAt = jest.fn(async () => undefined);
// Pretend the gap probe found a gap so `runRepairInner` does not early-return on
// `trigger === "recovery"` (otherwise the backfill — and the invalidation — never run).
const mockDetectGaps = jest.fn(async () => ({
  gaps: [{ day: "2026-05-07" as const }],
  probeReliable: true,
}));
const mockRunForcedYesterday = jest.fn(async () => undefined);
const mockRunForcedToday = jest.fn(async () => undefined);
const mockRunSerialized = jest.fn(async (fn: () => Promise<unknown>) => fn());
const mockCooldownAllowsRun = jest.fn(() => true);
const mockScheduleInvalidation = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  InteractionManager: { runAfterInteractions: (cb: () => void) => cb() },
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: (...args: unknown[]) => mockIngestRawEvent(...args),
}));

jest.mock("@/lib/integrations/appleHealth", () => ({
  pullStepCountForLocalCalendarDay: (...args: unknown[]) => mockPullStepsForDay(...args),
  requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  runAppleHealthStepsBackfill: jest.fn(async (
    opts: { token: string; lookbackDays?: number },
    deps: {
      pullStepCountForLocalCalendarDay: (d: string) => Promise<unknown>;
      ingestRawEvent: (
        body: unknown,
        token: string,
        opts: { idempotencyKey: string; timeoutMs: number },
      ) => Promise<{ ok: true } | { ok: false; error: string; requestId: string | null }>;
      stepsIdempotencyKey: (d: string) => string;
    },
  ) => {
    const today = "2026-05-07";
    await deps.pullStepCountForLocalCalendarDay(today);
    await deps.ingestRawEvent({}, opts.token, {
      idempotencyKey: deps.stepsIdempotencyKey(today),
      timeoutMs: 1,
    });
    return {
      ok: true as const,
      startedAt: "2026-05-07T12:00:00.000Z",
      completedAt: "2026-05-07T12:00:01.000Z",
      lookbackDays: 1,
      windowStartDay: today,
      windowEndDay: today,
      daysTotal: 1,
      daysProcessed: 1,
      daysIngested: 1,
      daysSkippedNoData: 0,
      daysFailed: 0,
      lastSuccessfulDay: today,
      triggerSource: "recovery" as const,
    };
  }),
  stepsIdempotencyKey: (d: string) => `appleHealth:v2:steps:${d}`,
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: (...args: unknown[]) => mockGetAppleHealthConnected(...args),
  getAppleHealthStepsAutoRepairLastCompletedAt: (...args: unknown[]) =>
    mockGetAutoRepairLastCompletedAt(...args),
  getAppleHealthStepsBackfillState: (...args: unknown[]) => mockGetBackfillState(...args),
  setAppleHealthStepsAutoRepairLastCompletedAt: (...args: unknown[]) =>
    mockSetAutoRepairLastCompletedAt(...args),
  setAppleHealthStepsBackfillState: (...args: unknown[]) => mockSetBackfillState(...args),
}));

jest.mock("@/lib/data/activity/appleHealthForcedLocalYesterdaySteps", () => ({
  runForcedLocalYesterdayAppleHealthStepsIngest: (...args: unknown[]) =>
    mockRunForcedYesterday(...args),
}));

jest.mock("@/lib/data/activity/appleHealthForcedLocalTodaySteps", () => ({
  runForcedLocalTodayAppleHealthStepsIngest: (...args: unknown[]) =>
    mockRunForcedToday(...args),
}));

jest.mock("@/lib/data/activity/detectAppleHealthStepsRawGaps", () => ({
  detectAppleHealthStepsRawGapsForRecentDays: (...args: unknown[]) => mockDetectGaps(...args),
}));

jest.mock("@/lib/data/activity/appleHealthStepsBackfillMutex", () => ({
  runAppleHealthStepsBackfillSerialized: (fn: () => Promise<unknown>) => mockRunSerialized(fn),
}));

jest.mock("@/lib/data/activity/stepsRepairCooldown", () => ({
  STEPS_REPAIR_AUTO_COOLDOWN_MS: 5 * 60 * 1000,
  stepsRepairCooldownAllowsRun: (...args: unknown[]) => mockCooldownAllowsRun(...args),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  getTodayDayKeyLocal: () => "2026-05-07",
}));

jest.mock("@/lib/sync/throttle", () => ({
  nowIso: () => "2026-05-07T12:00:00.000Z",
}));

jest.mock("@/lib/integrations/appleHealth/runAppleHealthStepsBackfill", () => ({
  APPLE_HEALTH_STEPS_BACKFILL_TRAILING_LOCAL_DAYS: 7,
}));

jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  scheduleDailyFactsInvalidationAfterIngest: (...args: unknown[]) =>
    mockScheduleInvalidation(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIngestRawEvent.mockResolvedValue({ ok: true });
  mockPullStepsForDay.mockResolvedValue({ ok: true, steps: 6651 });
});

describe("executeAppleHealthStepsRepair → daily facts invalidation", () => {
  it("schedules deferred dailyFacts invalidation for today after a successful ingest", async () => {
    const {
      executeAppleHealthStepsRepair,
    } = require("@/lib/data/activity/appleHealthStepsRepairCoordinator") as typeof import("@/lib/data/activity/appleHealthStepsRepairCoordinator");

    await executeAppleHealthStepsRepair({
      trigger: "recovery",
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockScheduleInvalidation).toHaveBeenCalledTimes(1);
    expect(mockScheduleInvalidation).toHaveBeenCalledWith({
      userUid: "u-1",
      day: "2026-05-07",
    });
  });

  it("does not schedule invalidation when userUid is missing (legacy callers)", async () => {
    const {
      executeAppleHealthStepsRepair,
    } = require("@/lib/data/activity/appleHealthStepsRepairCoordinator") as typeof import("@/lib/data/activity/appleHealthStepsRepairCoordinator");

    await executeAppleHealthStepsRepair({
      trigger: "recovery",
      getIdToken: async () => "tok",
    });

    expect(mockScheduleInvalidation).not.toHaveBeenCalled();
  });

  it("runs forced-today ingest unconditionally (bypasses gap probe + cooldown)", async () => {
    /** Bug class A → C: with no recent gaps, `runRepairInner` exits early on the recovery
     * trigger. If forced-today is gated by the same gap probe today's stale rawEvent never
     * gets re-posted. This test guards that today is always re-ingested via the forced path. */
    mockDetectGaps.mockResolvedValueOnce({ gaps: [], probeReliable: true });
    mockCooldownAllowsRun.mockReturnValueOnce(false);

    const {
      executeAppleHealthStepsRepair,
    } = require("@/lib/data/activity/appleHealthStepsRepairCoordinator") as typeof import("@/lib/data/activity/appleHealthStepsRepairCoordinator");

    await executeAppleHealthStepsRepair({
      trigger: "recovery",
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockRunForcedToday).toHaveBeenCalledTimes(1);
    expect(mockRunForcedToday).toHaveBeenCalledWith(
      expect.objectContaining({ userUid: "u-1" }),
    );
    expect(mockRunForcedYesterday).toHaveBeenCalledTimes(1);
  });
});
