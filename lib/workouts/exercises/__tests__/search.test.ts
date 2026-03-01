import { EXERCISE_CATALOG_V1 } from "../catalog";
import { searchExercises } from "../search";

describe("searchExercises", () => {
  it("is deterministic: same query yields same results", () => {
    const a = searchExercises(EXERCISE_CATALOG_V1, "bench");
    const b = searchExercises(EXERCISE_CATALOG_V1, "bench");
    expect(a).toEqual(b);
  });

  it("prefers exact name match", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "Bench Press");
    expect(res[0]?.exerciseId).toBe("bench_press");
  });

  it("supports aliases", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "ohp");
    expect(res[0]?.exerciseId).toBe("overhead_press");
  });

  it("returns empty for empty query", () => {
    expect(searchExercises(EXERCISE_CATALOG_V1, "")).toEqual([]);
  });
});
