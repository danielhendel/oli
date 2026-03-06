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

  it("token order independence: bench press and press bench both include bench_press in top results", () => {
    const a = searchExercises(EXERCISE_CATALOG_V1, "bench press", 20);
    const b = searchExercises(EXERCISE_CATALOG_V1, "press bench", 20);
    const aIds = a.map((r) => r.exerciseId);
    const bIds = b.map((r) => r.exerciseId);
    expect(aIds).toContain("bench_press");
    expect(bIds).toContain("bench_press");
    expect(aIds.indexOf("bench_press")).toBeLessThan(5);
    expect(bIds.indexOf("bench_press")).toBeLessThan(5);
  });

  it("prefix: ben yields bench_press in top results", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "ben", 20);
    const ids = res.map((r) => r.exerciseId);
    expect(ids).toContain("bench_press");
  });

  it("edit distance: dumbell bench yields dumbbell_bench_press in top results", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "dumbell bench", 20);
    const ids = res.map((r) => r.exerciseId);
    expect(ids).toContain("dumbbell_bench_press");
    expect(ids.indexOf("dumbbell_bench_press")).toBeLessThan(5);
  });

  it("curl yields bicep_curl in top results; when both appear, bicep_curl before leg_curl", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "curl", 40);
    const ids = res.map((r) => r.exerciseId);
    expect(ids).toContain("bicep_curl");
    const bicepIdx = ids.indexOf("bicep_curl");
    const legCurlIdx = ids.indexOf("leg_curl");
    if (legCurlIdx !== -1) {
      expect(bicepIdx).toBeLessThan(legCurlIdx);
    }
  });
});
