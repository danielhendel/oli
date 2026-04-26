import {
  buildStableCustomExerciseId,
  exerciseDefinitionCreateBodySchema,
  exerciseDefinitionRowSchema,
  exerciseDefinitionUpdateBodySchema,
  exerciseDefinitionUidPart,
  isUserScopedCustomExerciseId,
} from "../exerciseDefinition";

describe("exerciseDefinition contracts", () => {
  it("computes stable uid part", () => {
    expect(exerciseDefinitionUidPart("user_ab12cd34")).toBe("userab12");
  });

  it("buildStableCustomExerciseId avoids collisions", () => {
    const id = buildStableCustomExerciseId("user_ab12cd34", "Test Press", new Set(["custom_userab12_test_press"]));
    expect(id).toBe("custom_userab12_test_press_2");
  });

  it("isUserScopedCustomExerciseId accepts owned custom ids", () => {
    expect(isUserScopedCustomExerciseId("user_ab12cd34", "custom_userab12_my_move")).toBe(true);
  });

  it("isUserScopedCustomExerciseId rejects other users prefix", () => {
    expect(isUserScopedCustomExerciseId("user_ab12cd34", "custom_otherusr_my_move")).toBe(false);
  });

  it("create body schema accepts optional exerciseId", () => {
    const parsed = exerciseDefinitionCreateBodySchema.safeParse({
      name: "Move",
      equipment: "Cable",
      primary: "Back",
      loggingType: "weight_reps",
      exerciseId: "custom_userab12_move",
    });
    expect(parsed.success).toBe(true);
  });

  it("update body requires at least one field", () => {
    expect(exerciseDefinitionUpdateBodySchema.safeParse({}).success).toBe(false);
    expect(exerciseDefinitionUpdateBodySchema.safeParse({ name: "X" }).success).toBe(true);
  });

  it("row schema accepts optional stability and laterality", () => {
    const parsed = exerciseDefinitionRowSchema.safeParse({
      exerciseId: "custom_userab12_move",
      name: "Move",
      equipment: "Cable",
      primary: "Back",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      stability: "machine",
      laterality: "bilateral",
      muscleContributions: [{ subgroup: "lats", weight: 1 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.stability).toBe("machine");
      expect(parsed.data.laterality).toBe("bilateral");
    }
  });
});
