import { runSleepPullToRefresh } from "@/lib/data/sleep/runSleepPullToRefresh";

const mockPostOuraSleepDayRefresh = jest.fn();

jest.mock("@/lib/api/ouraSleepDayRefresh", () => ({
  postOuraSleepDayRefresh: (...args: unknown[]) => mockPostOuraSleepDayRefresh(...args),
}));

describe("runSleepPullToRefresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostOuraSleepDayRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: { ok: true, requestId: "r1", day: "2026-04-06", pullNowStatus: 202 },
    });
  });

  it("calls Oura sleep-day-refresh when selected day matches today", async () => {
    const refetchSleep = jest.fn().mockResolvedValue(undefined);
    const refetchWeekStrip = jest.fn().mockResolvedValue(undefined);
    const getIdToken = jest.fn().mockResolvedValue("token");

    const out = await runSleepPullToRefresh({
      selectedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      getIdToken,
      refetchSleep,
      refetchWeekStrip,
    });

    expect(out.didVendorSyncAndRecompute).toBe(true);
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalled();
    expect(refetchSleep).toHaveBeenCalled();
    expect(refetchWeekStrip).toHaveBeenCalled();
  });

  it("does not report vendor sync when sleep-day-refresh returns 404", async () => {
    mockPostOuraSleepDayRefresh.mockResolvedValueOnce({
      ok: false,
      status: 404,
      requestId: null,
      error: "not found",
      kind: "http",
    });
    const refetchSleep = jest.fn().mockResolvedValue(undefined);
    const refetchWeekStrip = jest.fn().mockResolvedValue(undefined);
    const getIdToken = jest.fn().mockResolvedValue("token");

    const out = await runSleepPullToRefresh({
      selectedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      getIdToken,
      refetchSleep,
      refetchWeekStrip,
    });

    expect(out.didVendorSyncAndRecompute).toBe(false);
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalled();
    expect(refetchSleep).toHaveBeenCalled();
  });

  it("skips vendor sync for a historical day", async () => {
    const refetchSleep = jest.fn().mockResolvedValue(undefined);
    const refetchWeekStrip = jest.fn().mockResolvedValue(undefined);
    const getIdToken = jest.fn().mockResolvedValue("token");

    const out = await runSleepPullToRefresh({
      selectedDay: "2026-04-05",
      todayDayKey: "2026-04-06",
      getIdToken,
      refetchSleep,
      refetchWeekStrip,
    });

    expect(out.didVendorSyncAndRecompute).toBe(false);
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
    expect(refetchSleep).toHaveBeenCalled();
    expect(refetchWeekStrip).toHaveBeenCalled();
  });
});
