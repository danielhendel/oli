import type { DashSleepAnchorResolution } from "../resolveDashSleepAnchorDay";
import { mergeDashSleepAnchorWithLock, reduceAnchorLock } from "../dashSleepAnchorLock";

const cal = "2026-05-12";
const prev = "2026-05-11";

function res(overrides: Partial<DashSleepAnchorResolution>): DashSleepAnchorResolution {
  return {
    sleepAnchorDay: cal,
    sleepAnchorSettled: false,
    calendarDayHasSleep: false,
    previousDayHasSleep: false,
    selectedReason: "loading",
    ...overrides,
  };
}

describe("reduceAnchorLock", () => {
  it("clears lock when calendar day changes", () => {
    const settled = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: prev,
      selectedReason: "overnight_probe_previous_day",
    });
    let lock = reduceAnchorLock(null, cal, settled);
    expect(lock?.resolution.sleepAnchorDay).toBe(prev);
    lock = reduceAnchorLock(lock, "2026-05-13", res({ sleepAnchorSettled: false, selectedReason: "loading" }));
    expect(lock).toBeNull();
  });

  it("does not replace previous-day overnight lock with wake-day calendar_empty", () => {
    const overnight = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: prev,
      selectedReason: "overnight_probe_previous_day",
    });
    let lock = reduceAnchorLock(null, cal, overnight);
    const wakeEmpty = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: cal,
      selectedReason: "calendar_empty",
    });
    lock = reduceAnchorLock(lock, cal, wakeEmpty);
    expect(lock?.resolution.sleepAnchorDay).toBe(prev);
    expect(lock?.resolution.selectedReason).toBe("overnight_probe_previous_day");
  });

  it("does not persist wake-day calendar_empty as a lock, but can upgrade to overnight when facts arrive", () => {
    const wakeEmpty = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: cal,
      selectedReason: "calendar_empty",
    });
    let lock = reduceAnchorLock(null, cal, wakeEmpty);
    expect(lock).toBeNull();
    const overnight = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: prev,
      selectedReason: "overnight_probe_previous_day",
    });
    lock = reduceAnchorLock(lock, cal, overnight);
    expect(lock?.resolution.sleepAnchorDay).toBe(prev);
  });
});

describe("mergeDashSleepAnchorWithLock (log reproduction)", () => {
  it("settled previousDay -> fresh loading -> merged previousDay with isUsingCachedSettledAnchor true", () => {
    const overnight = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: prev,
      selectedReason: "overnight_probe_previous_day",
    });
    const lock = { calendarToday: cal, resolution: { ...overnight } };
    const loading = res({ sleepAnchorSettled: false, selectedReason: "loading", sleepAnchorDay: cal });
    const { merged, isUsingCachedSettledAnchor } = mergeDashSleepAnchorWithLock(cal, loading, lock);
    expect(merged.sleepAnchorDay).toBe(prev);
    expect(merged.sleepAnchorSettled).toBe(true);
    expect(merged.selectedReason).toBe("overnight_probe_previous_day");
    expect(isUsingCachedSettledAnchor).toBe(true);
  });

  it("settled previous-day lock -> fresh wake calendar_empty -> merged previousDay with isUsingCachedSettledAnchor true", () => {
    const overnight = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: prev,
      selectedReason: "overnight_probe_previous_day",
    });
    const lock = { calendarToday: cal, resolution: { ...overnight } };
    const wakeEmpty = res({
      sleepAnchorSettled: true,
      sleepAnchorDay: cal,
      selectedReason: "calendar_empty",
    });
    const { merged, isUsingCachedSettledAnchor } = mergeDashSleepAnchorWithLock(cal, wakeEmpty, lock);
    expect(merged.sleepAnchorDay).toBe(prev);
    expect(merged.sleepAnchorSettled).toBe(true);
    expect(merged.selectedReason).toBe("overnight_probe_previous_day");
    expect(isUsingCachedSettledAnchor).toBe(true);
  });
});
