import { resolveSleepScreenStyleAnchorDay } from "../resolveSleepScreenStyleAnchorDay";

const week = ["2026-05-10", "2026-05-11", "2026-05-12", "2026-05-13", "2026-05-14", "2026-05-15", "2026-05-16"] as const;

describe("resolveSleepScreenStyleAnchorDay", () => {
  it("returns calendar today when presence is still loading (conservative)", () => {
    expect(
      resolveSleepScreenStyleAnchorDay("2026-05-12", week, {
        status: "partial",
      }),
    ).toBe("2026-05-12");
  });

  it("returns calendar today when that day has sleep data in the week", () => {
    const map: Record<string, boolean> = {};
    for (const k of week) map[k] = false;
    map["2026-05-12"] = true;
    expect(
      resolveSleepScreenStyleAnchorDay("2026-05-12", week, {
        status: "ready",
        hasSleepDataByDay: map,
      }),
    ).toBe("2026-05-12");
  });

  it("overnight / wake-day: snaps to latest prior week day with sleep when calendar today has none (Sleep tab semantics)", () => {
    const map: Record<string, boolean> = {};
    for (const k of week) map[k] = false;
    map["2026-05-11"] = true;
    expect(
      resolveSleepScreenStyleAnchorDay("2026-05-12", week, {
        status: "ready",
        hasSleepDataByDay: map,
      }),
    ).toBe("2026-05-11");
  });

  it("does not pick a day outside the week strip", () => {
    const map: Record<string, boolean> = { "2026-05-09": true };
    expect(
      resolveSleepScreenStyleAnchorDay("2026-05-12", week, {
        status: "ready",
        hasSleepDataByDay: map,
      }),
    ).toBe("2026-05-12");
  });

  it("misaligned historical fallback: no presence in week falls back to calendar today", () => {
    expect(
      resolveSleepScreenStyleAnchorDay("2026-05-12", week, {
        status: "ready",
        hasSleepDataByDay: {},
      }),
    ).toBe("2026-05-12");
  });
});
