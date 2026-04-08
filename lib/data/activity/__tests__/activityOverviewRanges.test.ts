import {
  activityMtdDaysThrough,
  activityWeekElapsedDaysThrough,
  activityYtdDaysThrough,
  computeActivityOverviewFetchDayKeys,
} from "@/lib/data/activity/activityOverviewRanges";

describe("activityWeekElapsedDaysThrough", () => {
  it("includes only week days on or before anchor (Sun–Sat week)", () => {
    const days = activityWeekElapsedDaysThrough("2026-04-09");
    expect(days[0]).toBe("2026-04-05");
    expect(days[days.length - 1]).toBe("2026-04-09");
    expect(days).toHaveLength(5);
  });
});

describe("activityMtdDaysThrough", () => {
  it("enumerates month start through selected day", () => {
    const days = activityMtdDaysThrough("2026-04-09");
    expect(days[0]).toBe("2026-04-01");
    expect(days[days.length - 1]).toBe("2026-04-09");
  });
});

describe("activityYtdDaysThrough", () => {
  it("enumerates Jan 1 through selected day", () => {
    const days = activityYtdDaysThrough("2026-04-09");
    expect(days[0]).toBe("2026-01-01");
    expect(days[days.length - 1]).toBe("2026-04-09");
  });
});

describe("computeActivityOverviewFetchDayKeys", () => {
  it("returns sorted unique keys covering all windows", () => {
    const keys = computeActivityOverviewFetchDayKeys("2026-04-09");
    expect(keys[0]).toBe("2026-01-01");
    expect(keys[keys.length - 1]).toBe("2026-04-09");
    const set = new Set(keys);
    expect(set.size).toBe(keys.length);
  });
});
