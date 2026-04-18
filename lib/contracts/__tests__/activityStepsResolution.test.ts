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

  it("multiple apple_health same instant: deterministic id tie-break (not higher steps)", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "b", sourceId: "apple_health", steps: 5000, updatedAt: "2026-04-01T12:00:00.000Z" },
      { id: "a", sourceId: "apple_health", steps: 1000, updatedAt: "2026-04-01T12:00:00.000Z" },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.id).toBe("a");
    expect(contributing[0]!.steps).toBe(1000);
  });

  it("multiple apple_health: latest updatedAt wins even when steps decrease", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "early", sourceId: "apple_health", steps: 15577, updatedAt: "2026-04-01T08:00:00.000Z" },
      { id: "late", sourceId: "apple_health", steps: 148, updatedAt: "2026-04-01T18:00:00.000Z" },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.steps).toBe(148);
    expect(contributing[0]!.id).toBe("late");
  });

  it("single non-apple event wins alone", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "m1", sourceId: "manual", steps: 3333 },
    ]);
    expect(resolvedStepsTotalFromContributing(contributing)).toBe(3333);
  });

  it("multiple non-apple same authoritative instant: lexicographic id wins (not higher steps)", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      { id: "z", sourceId: "manual", steps: 4000, updatedAt: "2026-04-01T12:00:00.000Z" },
      { id: "a", sourceId: "manual", steps: 4000, updatedAt: "2026-04-01T12:00:00.000Z" },
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

  it("same sourceSampleId: later authoritative row wins (downward correction)", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      {
        id: "idem_a",
        sourceId: "apple_health",
        sourceSampleId: "HK-sample-1",
        steps: 15577,
        updatedAt: "2026-04-01T08:00:00.000Z",
      },
      {
        id: "idem_b",
        sourceId: "apple_health",
        sourceSampleId: "HK-sample-1",
        steps: 148,
        updatedAt: "2026-04-01T18:00:00.000Z",
      },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.steps).toBe(148);
    expect(contributing[0]!.id).toBe("idem_b");
  });

  it("same sourceSampleId: earlier correct value kept when later row is older timestamp", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      {
        id: "good",
        sourceId: "apple_health",
        sourceSampleId: "HK-sample-2",
        steps: 5000,
        updatedAt: "2026-04-01T20:00:00.000Z",
      },
      {
        id: "stale_dup",
        sourceId: "apple_health",
        sourceSampleId: "HK-sample-2",
        steps: 999999,
        updatedAt: "2026-04-01T08:00:00.000Z",
      },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.steps).toBe(5000);
    expect(contributing[0]!.id).toBe("good");
  });

  it("two distinct sourceSampleIds: scalar picks one representative by latest instant then id", () => {
    const contributing = pickContributingStepEventsForDailyFacts([
      {
        id: "raw_z",
        sourceId: "apple_health",
        sourceSampleId: "sample-z",
        steps: 200,
        updatedAt: "2026-04-01T12:00:00.000Z",
      },
      {
        id: "raw_a",
        sourceId: "apple_health",
        sourceSampleId: "sample-a",
        steps: 100,
        updatedAt: "2026-04-01T12:00:00.000Z",
      },
    ]);
    expect(contributing).toHaveLength(1);
    expect(contributing[0]!.sourceSampleId).toBe("sample-a");
    expect(contributing[0]!.steps).toBe(100);
  });
});
