import {
  __resetSleepTodayRecoveryLedgerForTests,
  runSleepTodayRecoveryIfMissing,
} from "@/lib/data/sleep/runSleepTodayRecoveryIfMissing";

const mockPostOuraSleepDayRefresh = jest.fn();

jest.mock("@/lib/api/ouraSleepDayRefresh", () => ({
  postOuraSleepDayRefresh: (...args: unknown[]) =>
    mockPostOuraSleepDayRefresh(...args),
}));

describe("runSleepTodayRecoveryIfMissing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSleepTodayRecoveryLedgerForTests();
    mockPostOuraSleepDayRefresh.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: "r1",
      json: { ok: true, requestId: "r1", day: "2026-04-06", pullNowStatus: 202 },
    });
  });

  it("runs the canonical refresh + refetch when today's sleep is missing", async () => {
    const refetch = jest.fn();
    const out = await runSleepTodayRecoveryIfMissing({
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      now: () => 1_000,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    });

    expect(out).toEqual({ ran: true, reason: "ok" });
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(1);
    expect(mockPostOuraSleepDayRefresh.mock.calls[0]?.[1]).toEqual({
      day: "2026-04-06",
    });
    expect(refetch).toHaveBeenCalledTimes(1);
    const opts = (refetch.mock.calls[0]?.[0] ?? {}) as { cacheBust?: string };
    expect(opts.cacheBust).toMatch(/^sleep:today-recovery:/);
  });

  it("never runs for historical days", async () => {
    const refetch = jest.fn();
    const out = await runSleepTodayRecoveryIfMissing({
      uid: "user-a",
      requestedDay: "2026-04-05",
      todayDayKey: "2026-04-06",
      isMissing: true,
      now: () => 1_000,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    });
    expect(out).toEqual({ ran: false, reason: "not_today" });
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it("does not run when isMissing is false (already ready)", async () => {
    const refetch = jest.fn();
    const out = await runSleepTodayRecoveryIfMissing({
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: false,
      now: () => 1_000,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    });
    expect(out).toEqual({ ran: false, reason: "not_missing" });
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
  });

  it("rate-limits a second call within the window", async () => {
    const refetch = jest.fn();
    const args = {
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    };

    const first = await runSleepTodayRecoveryIfMissing({ ...args, now: () => 1_000 });
    expect(first.ran).toBe(true);

    const second = await runSleepTodayRecoveryIfMissing({ ...args, now: () => 10_000 });
    expect(second).toEqual({ ran: false, reason: "rate_limited" });
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(1);
  });

  it("allows recovery again once outside the rate-limit window", async () => {
    const refetch = jest.fn();
    const args = {
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      rateLimitMs: 5_000,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    };

    const first = await runSleepTodayRecoveryIfMissing({ ...args, now: () => 1_000 });
    expect(first.ran).toBe(true);

    const second = await runSleepTodayRecoveryIfMissing({ ...args, now: () => 9_000 });
    expect(second.ran).toBe(true);
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(2);
  });

  it("returns no_uid when uid is empty", async () => {
    const refetch = jest.fn();
    const out = await runSleepTodayRecoveryIfMissing({
      uid: "",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      now: () => 1_000,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    });
    expect(out).toEqual({ ran: false, reason: "no_uid" });
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
  });

  it("returns no_token when getIdToken resolves null", async () => {
    const refetch = jest.fn();
    const out = await runSleepTodayRecoveryIfMissing({
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      now: () => 1_000,
      getIdToken: jest.fn().mockResolvedValue(null),
      refetchSleep: refetch,
    });
    expect(out).toEqual({ ran: false, reason: "no_token" });
    expect(mockPostOuraSleepDayRefresh).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
  });

  it("returns refresh_failed without calling refetch if the refresh throws", async () => {
    mockPostOuraSleepDayRefresh.mockRejectedValueOnce(new Error("boom"));
    const refetch = jest.fn();
    const out = await runSleepTodayRecoveryIfMissing({
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      now: () => 1_000,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    });
    expect(out).toEqual({ ran: false, reason: "refresh_failed" });
    expect(refetch).not.toHaveBeenCalled();
  });

  it("returns refresh_failed on gateway 404 without refetch or retry loop", async () => {
    mockPostOuraSleepDayRefresh.mockResolvedValueOnce({
      ok: false,
      status: 404,
      requestId: null,
      error: "not found",
      kind: "http",
    });
    const refetch = jest.fn();
    const args = {
      uid: "user-a",
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    };

    const first = await runSleepTodayRecoveryIfMissing({ ...args, now: () => 1_000 });
    expect(first).toEqual({ ran: false, reason: "refresh_failed" });
    expect(refetch).not.toHaveBeenCalled();

    const second = await runSleepTodayRecoveryIfMissing({ ...args, now: () => 2_000 });
    expect(second).toEqual({ ran: false, reason: "rate_limited" });
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(1);
  });

  it("rate-limit ledger is scoped per uid:day (no cross-user leakage)", async () => {
    const refetch = jest.fn();
    const baseArgs = {
      requestedDay: "2026-04-06",
      todayDayKey: "2026-04-06",
      isMissing: true,
      getIdToken: jest.fn().mockResolvedValue("tok"),
      refetchSleep: refetch,
    };

    const a = await runSleepTodayRecoveryIfMissing({
      ...baseArgs,
      uid: "user-a",
      now: () => 1_000,
    });
    expect(a.ran).toBe(true);

    const b = await runSleepTodayRecoveryIfMissing({
      ...baseArgs,
      uid: "user-b",
      now: () => 1_000,
    });
    expect(b.ran).toBe(true);
    expect(mockPostOuraSleepDayRefresh).toHaveBeenCalledTimes(2);
  });
});
