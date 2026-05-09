/**
 * Subscriber + scheduler contract for {@link invalidateDailyFactsSessionCache}.
 *
 * Bug context: Apple Health steps backfill silently updates today's rawEvent →
 * canonical → DailyFacts on the backend, but Dash Daily Energy reads persisted
 * `dailyFacts.energy.factors.steps`. Without an invalidation signal, Dash kept
 * showing stale step calories until the user navigated away and back. These
 * tests lock in the bus shape that wires the auto-repair coordinator and the
 * manual sync hook to {@link useDailyFacts}.
 */
import {
  __testing_resetDailyFactsInvalidationListeners,
  invalidateDailyFactsSessionCache,
  scheduleDailyFactsInvalidationAfterIngest,
  subscribeDailyFactsInvalidations,
  DAILY_FACTS_INVALIDATION_DEFAULT_DELAY_MS,
} from "@/lib/data/dailyFactsSessionCache";

beforeEach(() => {
  __testing_resetDailyFactsInvalidationListeners();
});

describe("subscribeDailyFactsInvalidations", () => {
  it("invokes subscribers with the (userUid, day) when invalidate fires", () => {
    const cb = jest.fn();
    const unsub = subscribeDailyFactsInvalidations(cb);

    invalidateDailyFactsSessionCache({ userUid: "u1", day: "2026-05-07" });

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ userUid: "u1", day: "2026-05-07" });

    unsub();
    invalidateDailyFactsSessionCache({ userUid: "u1", day: "2026-05-08" });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("notifies multiple subscribers and isolates throws", () => {
    const cb1 = jest.fn(() => {
      throw new Error("subscriber-failed");
    });
    const cb2 = jest.fn();
    subscribeDailyFactsInvalidations(cb1);
    subscribeDailyFactsInvalidations(cb2);

    expect(() =>
      invalidateDailyFactsSessionCache({ userUid: "u1", day: "2026-05-07" }),
    ).not.toThrow();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

describe("scheduleDailyFactsInvalidationAfterIngest", () => {
  it("defers invalidation by the configured delay so backend recompute settles first", () => {
    const cb = jest.fn();
    subscribeDailyFactsInvalidations(cb);

    let scheduledMs: number | null = null;
    let fire: (() => void) | null = null;
    const fakeSchedule = jest.fn((run: () => void, ms: number) => {
      scheduledMs = ms;
      fire = run;
      return Symbol("handle");
    });

    scheduleDailyFactsInvalidationAfterIngest({
      userUid: "u1",
      day: "2026-05-07",
      schedule: fakeSchedule,
    });

    expect(fakeSchedule).toHaveBeenCalledTimes(1);
    expect(scheduledMs).toBe(DAILY_FACTS_INVALIDATION_DEFAULT_DELAY_MS);
    expect(cb).not.toHaveBeenCalled();

    fire!();
    expect(cb).toHaveBeenCalledWith({ userUid: "u1", day: "2026-05-07" });
  });

  it("returns a cancel that prevents the deferred invalidation", () => {
    const cb = jest.fn();
    subscribeDailyFactsInvalidations(cb);

    let fire: (() => void) | null = null;
    const cancelMock = jest.fn();
    const fakeSchedule = jest.fn((run: () => void) => {
      fire = run;
      return Symbol("handle");
    });

    const cancel = scheduleDailyFactsInvalidationAfterIngest({
      userUid: "u1",
      day: "2026-05-07",
      schedule: fakeSchedule,
      cancel: cancelMock,
    });
    cancel();

    expect(cancelMock).toHaveBeenCalledTimes(1);

    // Even if the timer somehow still fires after cancel, it must no-op.
    fire!();
    expect(cb).not.toHaveBeenCalled();
  });
});
