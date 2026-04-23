import {
  aggregateBundledExerciseUsageFromStrengthExercises,
  finalizeBundledExerciseUsageAggregation,
  isSyntheticIngestedExerciseId,
} from "../bundledExerciseUsageExport";

describe("bundledExerciseUsageExport", () => {
  test("detects synthetic ingested exercise ids", () => {
    expect(isSyntheticIngestedExerciseId("exercise:ingested:rid:0")).toBe(true);
    expect(isSyntheticIngestedExerciseId("bench_press")).toBe(false);
  });

  test("bundled catalog id directly in payload counts as used", () => {
    const partial = aggregateBundledExerciseUsageFromStrengthExercises(
      [{ exerciseId: "bench_press", name: "Bench Press" }],
      undefined,
    );
    const agg = finalizeBundledExerciseUsageAggregation(partial, {
      strengthExerciseRowsProcessed: 1,
      rawEventsProcessed: 1,
    });
    expect(agg.bundledExerciseIdsUsed).toContain("bench_press");
    expect(agg.distinctStableExerciseIdsFromStrengthPayloads).toContain("bench_press");
  });

  test("synthetic id + display name resolves via analytics fallback when name maps to catalog", () => {
    const partial = aggregateBundledExerciseUsageFromStrengthExercises(
      [{ exerciseId: "exercise:ingested:raw1:0", name: "Bench Press" }],
      undefined,
    );
    const agg = finalizeBundledExerciseUsageAggregation(partial, {
      strengthExerciseRowsProcessed: 1,
      rawEventsProcessed: 1,
    });
    expect(agg.bundledExerciseIdsUsed).toContain("bench_press");
    expect(agg.unresolvedLegacyExerciseNames.find((x) => x.name === "Bench Press")).toBeUndefined();
  });

  test("unused excludes ambiguous ids from archive audit helper", () => {
    const partial = aggregateBundledExerciseUsageFromStrengthExercises([], undefined);
    const agg = finalizeBundledExerciseUsageAggregation(partial, {
      strengthExerciseRowsProcessed: 0,
      rawEventsProcessed: 0,
    });
    for (const id of agg.ambiguousBundledExerciseIds) {
      expect(agg.unusedBundledExerciseIds).not.toContain(id);
    }
  });
});
