/**
 * Locks in the forced-today HK steps ingest contract:
 * - posts to /ingest when HealthKit > stored dailyFacts.activity.steps (today is growing)
 * - skips post when stored already matches HK (no need to disturb the chain)
 * - schedules deferred dailyFacts cache invalidation only on a successful ingest with userUid
 *
 * Why this exists: the recovery branch of the repair coordinator gates on
 * `detectAppleHealthStepsRawGapsForRecentDays`, which only fills missing rawEvent docs.
 * Today's rawEvent doc almost always exists already (created at app open with a partial
 * morning total); without a forced-today path it never gets re-posted with the growing
 * HK total, leaving Daily Energy NEAT frozen.
 */
import { jest } from "@jest/globals";

const mockIngestRawEvent = jest.fn();
const mockGetDailyFacts = jest.fn();
const mockTruthOutcome = jest.fn();
const mockPullStepsForDay = jest.fn();
const mockRequestPermissions = jest.fn(async () => ({ ok: true as const }));
const mockGetAppleHealthConnected = jest.fn(async () => true);
const mockSetLastIngestedStepsForDay = jest.fn(async () => undefined);
const mockScheduleInvalidation = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("@/lib/api/ingest", () => ({
  ingestRawEvent: (...args: unknown[]) => mockIngestRawEvent(...args),
}));

jest.mock("@/lib/api/usersMe", () => ({
  getDailyFacts: (...args: unknown[]) => mockGetDailyFacts(...args),
}));

jest.mock("@/lib/data/truthOutcome", () => ({
  truthOutcomeFromApiResult: (...args: unknown[]) => mockTruthOutcome(...args),
}));

jest.mock("@/lib/integrations/appleHealth/healthKit", () => ({
  pullStepCountForLocalCalendarDay: (...args: unknown[]) => mockPullStepsForDay(...args),
  requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  getLocalCalendarDayBoundsFromYmd: (day: string) => ({
    start: `${day}T00:00:00.000Z`,
    end: `${day}T23:59:59.999Z`,
    day,
  }),
}));

jest.mock("@/lib/integrations/appleHealth/idempotency", () => ({
  stepsIdempotencyKey: (day: string) => `appleHealth:v2:steps:${day}`,
}));

jest.mock("@/lib/integrations/appleHealth/storage", () => ({
  getAppleHealthConnected: (...args: unknown[]) => mockGetAppleHealthConnected(...args),
  setLastIngestedStepsForDay: (...args: unknown[]) => mockSetLastIngestedStepsForDay(...args),
}));

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  getTodayDayKeyLocal: () => "2026-05-07",
}));

jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  scheduleDailyFactsInvalidationAfterIngest: (...args: unknown[]) =>
    mockScheduleInvalidation(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockIngestRawEvent.mockResolvedValue({ ok: true });
  mockGetDailyFacts.mockResolvedValue({ ok: true, json: { activity: { steps: 419 } } });
  mockTruthOutcome.mockReturnValue({ status: "ready", data: { activity: { steps: 419 } } });
  mockPullStepsForDay.mockResolvedValue({ ok: true, steps: 11255 });
});

describe("runForcedLocalTodayAppleHealthStepsIngest", () => {
  it("posts /ingest when HealthKit (11255) > stored dailyFacts.activity.steps (419)", async () => {
    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockIngestRawEvent).toHaveBeenCalledTimes(1);
    const [body, token, opts] = mockIngestRawEvent.mock.calls[0]!;
    expect(token).toBe("tok");
    expect(opts).toEqual({
      idempotencyKey: "appleHealth:v2:steps:2026-05-07",
      timeoutMs: 15000,
    });
    expect((body as { kind?: string; payload?: { steps?: number; day?: string } }).kind).toBe(
      "steps",
    );
    expect((body as { payload?: { steps?: number; day?: string } }).payload?.steps).toBe(11255);
    expect((body as { payload?: { day?: string } }).payload?.day).toBe("2026-05-07");
  });

  it("schedules deferred dailyFacts invalidation for today after a successful ingest", async () => {
    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockScheduleInvalidation).toHaveBeenCalledWith({
      userUid: "u-1",
      day: "2026-05-07",
    });
  });

  it("skips /ingest when stored steps already match HealthKit (no churn)", async () => {
    mockTruthOutcome.mockReturnValue({ status: "ready", data: { activity: { steps: 11255 } } });

    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockIngestRawEvent).not.toHaveBeenCalled();
    expect(mockScheduleInvalidation).not.toHaveBeenCalled();
  });

  it("skips /ingest when stored steps exceed HealthKit (HK partial — never regress)", async () => {
    mockTruthOutcome.mockReturnValue({ status: "ready", data: { activity: { steps: 12000 } } });
    mockPullStepsForDay.mockResolvedValue({ ok: true, steps: 11255 });

    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockIngestRawEvent).not.toHaveBeenCalled();
  });

  it("does not schedule invalidation when userUid is missing", async () => {
    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
    });

    expect(mockIngestRawEvent).toHaveBeenCalled();
    expect(mockScheduleInvalidation).not.toHaveBeenCalled();
  });

  it("posts /ingest when stored dailyFacts is missing entirely (first-of-day)", async () => {
    mockTruthOutcome.mockReturnValue({ status: "missing" });

    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockIngestRawEvent).toHaveBeenCalledTimes(1);
  });

  it("does not post when not connected", async () => {
    mockGetAppleHealthConnected.mockResolvedValueOnce(false);

    const {
      runForcedLocalTodayAppleHealthStepsIngest,
    } = require("@/lib/data/activity/appleHealthForcedLocalTodaySteps") as typeof import("@/lib/data/activity/appleHealthForcedLocalTodaySteps");

    await runForcedLocalTodayAppleHealthStepsIngest({
      getIdToken: async () => "tok",
      userUid: "u-1",
    });

    expect(mockIngestRawEvent).not.toHaveBeenCalled();
    expect(mockScheduleInvalidation).not.toHaveBeenCalled();
  });
});
