import {
  normalizeExerciseNameForCatalogLookup,
  resolveCatalogExerciseIdByName,
} from "../customExerciseStore";

describe("legacy catalog name resolution (logged strength names → bundled ids)", () => {
  describe("explicit legacy examples", () => {
    it.each([
      ["Standing Barbell Shoulder Press", "overhead_press"],
      ["Seated Cable Close Row", "seated_cable_row"],
      ["Walking Lunges (kettlebell)", "kettlebell_lunge"],
      ["Straight Bar Tricep Extensions", "tricep_pushdown"],
    ] as const)("maps %s → %s", (logged, exerciseId) => {
      expect(resolveCatalogExerciseIdByName(logged)).toBe(exerciseId);
    });
  });

  /** Staging export stragglers: deterministic name/alias/redirect coverage (2026-04). */
  describe("final legacy export name list", () => {
    it.each([
      ["Angled Leg Press (Hoist)", "leg_press"],
      ["Aresenal Strentgh Fly Machine", "machine_chest_fly"],
      ["Chest Press Machine (Hoist)", "machine_chest_press"],
      ["Ez Bar Standing Preacher Curls", "ez_bar_preacher_curl"],
      ["Hamstring Curls (Atlantis)", "leg_curl"],
      ["Hanmer Strength Leg Extension", "leg_extension"],
      ["Hip Abduction Machine (Atlantis)", "machine_hip_abduction"],
      ["Imcline Single Arm Lateral Raise", "lateral_raise"],
      ["Iso Horizontal Chest Press (Hammer Strentgh)", "machine_chest_press"],
      ["Lateral Raise Machine (Hammer Strentgh)", "lateral_raise"],
      ["Lying Hamstring Curls (Cybex)", "machine_leg_curl_lying"],
      ["Quad Extebsions (Atlantis)", "leg_extension"],
      ["Seated Calf Raise Machine (Hoist)", "machine_calf_raise_seated"],
      ["Single Leg Unilateral Leg Press (Atlantis)", "leg_press"],
      ["Sitting V-Grip Lat Pulldown", "cable_pulldown_close"],
      ["Smith Machine Underhand Grip Bent Over Row", "smith_machine_row"],
      ["Standing Cable Bicep Curls (Hoist)", "cable_bicep_curl"],
      ["Standing Cable Straight Bar Front Raise", "cable_front_raise"],
      ["Straight Bar Cable Lat Pullover", "dumbbell_pullover"],
      ["Straight Bar Lat Pullover", "dumbbell_pullover"],
      ["Tricep Cable Straight Bar Pushdown", "tricep_pushdown"],
    ] as const)("maps %s → %s", (logged, exerciseId) => {
      expect(resolveCatalogExerciseIdByName(logged)).toBe(exerciseId);
    });

    it("leaves Cable External Rotation unresolved (no cable rotator cuff entry in v1 library)", () => {
      expect(resolveCatalogExerciseIdByName("Cable External Rotation")).toBeNull();
    });
  });

  describe("normalizeExerciseNameForCatalogLookup", () => {
    it("collapses separators and curly quotes", () => {
      expect(normalizeExerciseNameForCatalogLookup("Cable  Bicep\tCurl")).toBe("cable bicep curl");
      expect(normalizeExerciseNameForCatalogLookup("Bench\u2019s test")).toBe("bench's test");
    });

    it("removes deterministic equipment parens including kettlebell", () => {
      expect(normalizeExerciseNameForCatalogLookup("Walking Lunges (kettlebell)")).toBe("walking lunges");
      expect(normalizeExerciseNameForCatalogLookup("Pushdown (rope)")).toBe("pushdown");
    });

    it("does not strip (barbell) vs (dumbbell) distinctions", () => {
      expect(normalizeExerciseNameForCatalogLookup("Bulgarian Split Squat (Barbell)")).toContain("(barbell)");
      expect(normalizeExerciseNameForCatalogLookup("Bulgarian Split Squat (Dumbbell)")).toContain("(dumbbell)");
    });
  });

  describe("existing catalog mappings unaffected", () => {
    it("Cable Bicep Curl and db hammer curl still resolve", () => {
      expect(resolveCatalogExerciseIdByName("Cable Bicep Curl")).toBe("cable_bicep_curl");
      expect(resolveCatalogExerciseIdByName("db hammer curl")).toBe("hammer_curl");
    });

    it("Bench Press canonical name resolves", () => {
      expect(resolveCatalogExerciseIdByName("Bench Press")).toBe("bench_press");
    });
  });
});
