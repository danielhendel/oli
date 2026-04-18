import { describe, it, expect, beforeEach, jest } from "@jest/globals";

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiResult } from "@/lib/api/http";
import * as ingestApi from "@/lib/api/ingest";
import * as usersMeApi from "@/lib/api/usersMe";
import type { DailyFactsDto } from "@/lib/contracts/dailyFacts";
import { runForcedLocalYesterdayAppleHealthStepsIngest } from "@/lib/data/activity/appleHealthForcedLocalYesterdaySteps";
import * as healthKit from "@/lib/integrations/appleHealth/healthKit";
import * as appleStorage from "@/lib/integrations/appleHealth/storage";

jest.mock("@/lib/ui/calendar/dateUtils", () => ({
  getTodayDayKeyLocal: () => "2026-04-16",
}));

const pullStepCountForLocalCalendarDay = jest.spyOn(healthKit, "pullStepCountForLocalCalendarDay");
const requestPermissions = jest.spyOn(healthKit, "requestPermissions");
const ingestRawEvent = jest.spyOn(ingestApi, "ingestRawEvent");
const getDailyFacts = jest.spyOn(usersMeApi, "getDailyFacts");

function dailyFactsOk(steps: number | undefined, day = "2026-04-15"): ApiResult<DailyFactsDto> {
  const base = {
    schemaVersion: 1 as const,
    userId: "test-user",
    date: day,
    computedAt: "2026-04-15T12:00:00.000Z",
  };
  return {
    ok: true,
    status: 200,
    requestId: null,
    json:
      steps === undefined
        ? { ...base, activity: {} }
        : { ...base, activity: { steps } },
  };
}

describe("runForcedLocalYesterdayAppleHealthStepsIngest", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(appleStorage, "getAppleHealthConnected").mockResolvedValue(true);
    requestPermissions.mockResolvedValue({ ok: true } as never);
    pullStepCountForLocalCalendarDay.mockResolvedValue({ ok: true, steps: 8421 });
    ingestRawEvent.mockResolvedValue({
      ok: true,
      status: 202,
      data: { ok: true, rawEventId: "x", day: "2026-04-15" },
      requestId: null,
    });
    getDailyFacts.mockResolvedValue(dailyFactsOk(8421));
  });

  it("does not POST when GET dailyFacts steps already match HealthKit", async () => {
    await runForcedLocalYesterdayAppleHealthStepsIngest(async () => "token");

    expect(pullStepCountForLocalCalendarDay).toHaveBeenCalledWith("2026-04-15");
    expect(getDailyFacts).toHaveBeenCalledWith("2026-04-15", "token", expect.any(Object));
    expect(ingestRawEvent).not.toHaveBeenCalled();
  });

  it("POSTs ingest when stored steps disagree with HealthKit", async () => {
    getDailyFacts.mockResolvedValueOnce(dailyFactsOk(138)).mockResolvedValue(dailyFactsOk(8421));

    await runForcedLocalYesterdayAppleHealthStepsIngest(async () => "token");

    expect(ingestRawEvent).toHaveBeenCalledTimes(1);
    const idem = ingestRawEvent.mock.calls[0]![2]?.idempotencyKey;
    expect(idem).toBe("appleHealth:v2:steps:2026-04-15");
  });

  it("POSTs ingest when dailyFacts has no steps (stored null)", async () => {
    getDailyFacts.mockResolvedValueOnce(dailyFactsOk(undefined)).mockResolvedValue(dailyFactsOk(8421));

    await runForcedLocalYesterdayAppleHealthStepsIngest(async () => "token");

    expect(ingestRawEvent).toHaveBeenCalledTimes(1);
  });

  it("polls dailyFacts after ingest until steps match HK", async () => {
    getDailyFacts
      .mockResolvedValueOnce(dailyFactsOk(100))
      .mockResolvedValueOnce(dailyFactsOk(100))
      .mockResolvedValueOnce(dailyFactsOk(100))
      .mockResolvedValueOnce(dailyFactsOk(8421));

    await runForcedLocalYesterdayAppleHealthStepsIngest(async () => "token");

    expect(ingestRawEvent).toHaveBeenCalledTimes(1);
    expect(getDailyFacts.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("does not pull/ingest today (only yesterday)", async () => {
    await runForcedLocalYesterdayAppleHealthStepsIngest(async () => "token");

    expect(pullStepCountForLocalCalendarDay).toHaveBeenCalledWith("2026-04-15");
    expect(pullStepCountForLocalCalendarDay).not.toHaveBeenCalledWith("2026-04-16");
  });
});
