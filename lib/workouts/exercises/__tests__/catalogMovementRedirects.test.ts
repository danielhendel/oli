import { resolveDeterministicMovementRedirect } from "../catalogMovementRedirects";
import { normalizeExerciseNameForCatalogLookup, resolveCatalogExerciseIdByName } from "../customExerciseStore";

describe("catalogMovementRedirects + aggressive normalization", () => {
  it("strips gym brands then resolves catalog or redirect", () => {
    expect(resolveCatalogExerciseIdByName("Hoist Plate Loaded Leg Press")).toBe("leg_press");
    expect(resolveCatalogExerciseIdByName("Hammer Strength Iso-Lateral Leg Press")).toBe("leg_press");
    expect(resolveCatalogExerciseIdByName("Life Fitness Chest Press")).toBe("machine_chest_press");
    expect(resolveCatalogExerciseIdByName("Cybex Seated Cable Row")).toBe("seated_cable_row");
    expect(resolveCatalogExerciseIdByName("Atlantis Low Row")).toBe("machine_row");
  });

  it("does not confuse flat bench with smith bench", () => {
    expect(resolveCatalogExerciseIdByName("Bench Press")).toBe("bench_press");
    expect(normalizeExerciseNameForCatalogLookup("Smith Machine Bench Press")).toBe("smith bench press");
    expect(resolveCatalogExerciseIdByName("Smith Machine Bench Press")).toBe("smith_machine_bench_press");
  });

  it("deterministic redirects for compound phrases when map misses", () => {
    expect(resolveDeterministicMovementRedirect("tricep pushdown")).toBe("tricep_pushdown");
    expect(resolveDeterministicMovementRedirect("chest press")).toBe("machine_chest_press");
    expect(resolveDeterministicMovementRedirect("seated row")).toBe("seated_cable_row");
    expect(resolveDeterministicMovementRedirect("band bicep curl")).toBe("band_bicep_curl");
    expect(resolveDeterministicMovementRedirect("machine bicep curl")).toBe("machine_bicep_curl");
  });

  it("keyword bicep curl routing", () => {
    expect(resolveDeterministicMovementRedirect("cable bicep curl")).toBe("cable_bicep_curl");
    expect(resolveDeterministicMovementRedirect("dumbbell bicep curl")).toBe("dumbbell_curl");
    expect(resolveDeterministicMovementRedirect("ez bar bicep curl")).toBe("bicep_curl");
  });
});
