import { normalizeActivityDayRouteParam } from "../activityDayRouteParam";

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
