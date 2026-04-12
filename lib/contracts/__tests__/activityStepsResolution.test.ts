import {
  pickContributingStepEventsForDailyFacts,
  resolvedStepsTotalFromContributing,
} from "../activityStepsResolution";

describe("activityStepsResolution", () => {
  it("prefers apple_health when present (no double count with manual)", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "m1", sourceId: "manual", steps: 9000 },
      { id: "a1", sourceId: "apple_health", steps: 5012 },
    ]);
    expect(contributing.map((e) => e.id)).toEqual(["a1"]);
    expect(resolvedStepsTotalFromContributing(contributing)).toBe(5012);
  });

  it("multiple apple_health: picks one row (highest steps) to avoid double-counting daily totals", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "b", sourceId: "apple_health", steps: 1000 },
      { id: "a", sourceId: "apple_health", steps: 5000 },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.steps).toBe(5000);
  });

  it("single non-apple event wins alone", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "m1", sourceId: "manual", steps: 3333 },
    ]);
    expect(resolvedStepsTotalFromContributing(contributing)).toBe(3333);
  });

  it("multiple non-apple: picks highest steps, tie-break by id", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "z", sourceId: "manual", steps: 4000 },
      { id: "a", sourceId: "manual", steps: 4000 },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.id).toBe("a");
  });

  it("healthkit is Apple-class: excludes non-apple sources (same as apple_health)", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "oura", sourceId: "oura", steps: 4794 },
      { id: "hk", sourceId: "healthkit", steps: 74 },
    ]);
    expect(contributing.map((e) => e.id)).toEqual(["hk"]);
    expect(resolvedStepsTotalFromContributing(contributing)).toBe(74);
  });

  it("resolvedStepsTotalFromContributing collapses a raw multi-source list (never sums vendors)", () => {
    const raw = [
      { id: "oura", sourceId: "oura", steps: 4794 },
      { id: "ah", sourceId: "apple_health", steps: 74 },
    ];
    expect(resolvedStepsTotalFromContributing(raw)).toBe(74);
  });

  it("regression: apple_health wins over Oura (74 vs 4794; pick + resolved, never sum)", () => {
    const events = [
      { id: "oura_steps", sourceId: "oura", steps: 4794 },
      { id: "appleHealth:v2:steps:2026-03-01", sourceId: "apple_health", steps: 74 },
    ];
    const contributing = pickContributingStepEventsForDailyFacts(events);
    expect(contributing.map((e) => e.id)).toEqual(["appleHealth:v2:steps:2026-03-01"]);
    expect(resolvedStepsTotalFromContributing(events)).toBe(74);
  });

  it("regression: HealthKit is Apple-class over Oura (67 vs 4794)", () => {
    const events = [
      { id: "oura_steps", sourceId: "oura", steps: 4794 },
      { id: "hk_daily", sourceId: "healthkit", steps: 67 },
    ];
    const contributing = pickContributingStepEventsForDailyFacts(events);
    expect(contributing.map((e) => e.id)).toEqual(["hk_daily"]);
    expect(resolvedStepsTotalFromContributing(events)).toBe(67);
  });
});
