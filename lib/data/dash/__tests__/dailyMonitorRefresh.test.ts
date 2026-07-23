import {
  DAILY_MONITOR_QUIET_REFRESH_DEDUPE_MS,
  runDailyMonitorRefresh,
} from "../dailyMonitorRefresh";

describe("runDailyMonitorRefresh", () => {
  function deps(overrides?: Partial<Parameters<typeof runDailyMonitorRefresh>[0]>) {
    return {
      userUid: "u1",
      dayKey: "2026-07-20" as const,
      invalidateDailyFacts: jest.fn(),
      scheduleStepsRepair: jest.fn(),
      invalidateWorkoutCalendar: jest.fn(),
      refetchSleep: jest.fn(),
      refetchReadiness: jest.fn(),
      refetchStress: jest.fn(),
      refreshDayKey: jest.fn(),
      ...overrides,
    };
  }

  it("coordinates facts invalidation, steps repair, sleep/readiness/stress, and sessions", () => {
    const d = deps();
    const result = runDailyMonitorRefresh(d, { reason: "pull", bust: "t1" });
    expect(d.scheduleStepsRepair).toHaveBeenCalledTimes(1);
    expect(d.invalidateDailyFacts).toHaveBeenCalledWith({ userUid: "u1", day: "2026-07-20" });
    expect(d.refetchSleep).toHaveBeenCalledWith({ cacheBust: "t1" });
    expect(d.refetchReadiness).toHaveBeenCalledWith({ cacheBust: "t1" });
    expect(d.refetchStress).toHaveBeenCalledWith({ cacheBust: "t1" });
    expect(d.invalidateWorkoutCalendar).toHaveBeenCalledTimes(1);
    expect(result.succeededDomains).toEqual(
      expect.arrayContaining(["activity", "energy", "nutrition", "sleep", "readiness", "stress", "workout", "cardio"]),
    );
    expect(result.failedDomains).toEqual([]);
  });

  it("records failed domains without throwing when a handler fails", () => {
    const d = deps({
      refetchSleep: jest.fn(() => {
        throw new Error("sleep offline");
      }),
    });
    const result = runDailyMonitorRefresh(d, { reason: "focus", bust: "t2" });
    expect(result.failedDomains).toContain("sleep");
    expect(result.succeededDomains).toContain("activity");
    expect(d.invalidateDailyFacts).toHaveBeenCalled();
  });

  it("does not invent Absolute Energy classification side effects", () => {
    const d = deps();
    const result = runDailyMonitorRefresh(d, { reason: "pull" });
    expect(JSON.stringify(result)).not.toMatch(/Estimated|PAL|Low|Moderate|High|Very High/);
  });

  it("exports a quiet-refresh dedupe window", () => {
    expect(DAILY_MONITOR_QUIET_REFRESH_DEDUPE_MS).toBeGreaterThanOrEqual(1000);
  });
});
