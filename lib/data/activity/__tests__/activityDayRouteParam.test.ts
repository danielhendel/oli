import { activityDayKeyFromActivityDayPathname, normalizeActivityDayRouteParam } from "../activityDayRouteParam";

describe("activityDayKeyFromActivityDayPathname", () => {
  it("parses the trailing day segment from the normalized activity day path", () => {
    expect(activityDayKeyFromActivityDayPathname("/activity/day/2026-04-14")).toBe("2026-04-14");
  });

  it("accepts a trailing slash", () => {
    expect(activityDayKeyFromActivityDayPathname("/activity/day/2026-04-14/")).toBe("2026-04-14");
  });

  it("returns null when the path does not match", () => {
    expect(activityDayKeyFromActivityDayPathname("/activity/day/not-a-day")).toBeNull();
    expect(activityDayKeyFromActivityDayPathname("/workouts/day/2026-04-14")).toBeNull();
    expect(activityDayKeyFromActivityDayPathname(undefined)).toBeNull();
  });
});

describe("normalizeActivityDayRouteParam", () => {
  it("accepts a valid string", () => {
    expect(normalizeActivityDayRouteParam("2026-04-08")).toEqual({ ok: true, day: "2026-04-08" });
  });

  it("uses the first element when given string[]", () => {
    expect(normalizeActivityDayRouteParam(["2026-05-01", "ignored"])).toEqual({ ok: true, day: "2026-05-01" });
  });

  it("rejects invalid day strings", () => {
    expect(normalizeActivityDayRouteParam("04-08-2026").ok).toBe(false);
    expect(normalizeActivityDayRouteParam("2026-4-8").ok).toBe(false);
    expect(normalizeActivityDayRouteParam("").ok).toBe(false);
    expect(normalizeActivityDayRouteParam(undefined).ok).toBe(false);
    expect(normalizeActivityDayRouteParam(["bad"]).ok).toBe(false);
  });
});
