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

  it("token order independence: bench press and press bench both yield bench_press first", () => {
    const a = searchExercises(EXERCISE_CATALOG_V1, "bench press");
    const b = searchExercises(EXERCISE_CATALOG_V1, "press bench");
    expect(a[0]?.exerciseId).toBe("bench_press");
    expect(b[0]?.exerciseId).toBe("bench_press");
  });

  it("prefix boost: ben yields bench_press first", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "ben");
    expect(res[0]?.exerciseId).toBe("bench_press");
  });

  it("edit distance: dumbell bench yields dumbbell_bench_press first", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "dumbell bench");
    expect(res[0]?.exerciseId).toBe("dumbbell_bench_press");
  });

  it("alias exact beats substring: curl yields bicep_curl before leg_curl", () => {
    const res = searchExercises(EXERCISE_CATALOG_V1, "curl");
    expect(res[0]?.exerciseId).toBe("bicep_curl");
    const ids = res.map((r) => r.exerciseId);
    const legCurlIdx = ids.indexOf("leg_curl");
    const bicepIdx = ids.indexOf("bicep_curl");
    expect(bicepIdx).toBeLessThan(legCurlIdx);
  });
});
