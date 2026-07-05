import {
  __resetDashDataBudgetWarningsForTests,
  boundDayKeys,
  networkDayKeysThroughToday,
  warnDashDataBudgetOnce,
} from "@/lib/dates/boundDayKeys";
import type { DayKey } from "@/lib/ui/calendar/types";

describe("boundDayKeys", () => {
  const today = "2026-07-05" as DayKey;

  it("removes invalid day keys", () => {
    expect(boundDayKeys(["bad", "2026-07-01", "2026-07-02"], { todayKey: today })).toEqual([
      "2026-07-01",
      "2026-07-02",
    ]);
  });

  it("dedupes and sorts", () => {
    expect(
      boundDayKeys(["2026-07-03", "2026-07-01", "2026-07-03", "2026-07-02"], { todayKey: today }),
    ).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });

  it("excludes future days by default", () => {
    expect(
      boundDayKeys(["2026-07-04", "2026-07-05", "2026-07-06", "2026-07-11"], { todayKey: today }),
    ).toEqual(["2026-07-04", "2026-07-05"]);
  });

  it("allows future days when explicit", () => {
    expect(
      boundDayKeys(["2026-07-04", "2026-07-06"], { todayKey: today, allowFuture: true }),
    ).toEqual(["2026-07-04", "2026-07-06"]);
  });

  it("respects maxDays trailing cap", () => {
    expect(
      boundDayKeys(["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"], {
        todayKey: today,
        maxDays: 3,
      }),
    ).toEqual(["2026-07-03", "2026-07-04", "2026-07-05"]);
  });
});

describe("networkDayKeysThroughToday", () => {
  it("drops future keys from a week array", () => {
    const week: DayKey[] = [
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
    ];
    expect(networkDayKeysThroughToday(week, "2026-07-05")).toEqual(["2026-07-05"]);
  });
});

describe("warnDashDataBudgetOnce", () => {
  beforeEach(() => {
    __resetDashDataBudgetWarningsForTests();
  });

  it("warns once per caller signature in dev", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    warnDashDataBudgetOnce("ActivityRollupProvider", 372);
    warnDashDataBudgetOnce("ActivityRollupProvider", 372);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
