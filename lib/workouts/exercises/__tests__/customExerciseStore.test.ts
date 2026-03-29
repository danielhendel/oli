import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createCustomExercise,
  listCustomExercises,
  resolveCatalogExerciseIdByName,
  resolveCustomExercisePrimaryMuscleGroup,
  sanitizeCustomExerciseName,
} from "../customExerciseStore";

describe("customExerciseStore", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("creates custom exercise with stable namespaced id", async () => {
    const row = await createCustomExercise("user-123", {
      name: "Leg Press",
      equipment: "Machine",
      primary: "Legs",
      loggingType: "weight_reps",
    });
    expect(row.exerciseId.startsWith("custom_user123_")).toBe(true);
    expect(row.name).toBe("Leg Press");
    expect(row.equipment).toBe("Machine");
    expect(row.primary).toBe("Legs");
    expect(row.loggingType).toBe("weight_reps");
  });

  it("persists and lists records for uid", async () => {
    await createCustomExercise("u1", {
      name: "Cable Crunch",
      equipment: "Cable",
      primary: "Core",
      loggingType: "reps_only",
    });
    const rows = await listCustomExercises("u1");
    expect(rows.length).toBe(1);
    expect(rows[0]?.name).toBe("Cable Crunch");
  });

  it("allows duplicate names but generates unique ids", async () => {
    const a = await createCustomExercise("u1", {
      name: "Pullover",
      equipment: "Dumbbell",
      primary: "Back",
      loggingType: "weight_reps",
    });
    const b = await createCustomExercise("u1", {
      name: "Pullover",
      equipment: "Dumbbell",
      primary: "Back",
      loggingType: "weight_reps",
    });
    expect(a.exerciseId).not.toBe(b.exerciseId);
  });

  it("normalizes whitespace in names", () => {
    expect(sanitizeCustomExerciseName("  Leg   Press   ")).toBe("Leg Press");
  });

  it("resolves catalog exercise id from custom free-text names/aliases", () => {
    expect(resolveCatalogExerciseIdByName("Cable Bicep Curl")).toBe("cable_bicep_curl");
    expect(resolveCatalogExerciseIdByName("db hammer curl")).toBe("hammer_curl");
  });

  it("resolves custom primary muscle from catalog name match first", () => {
    const group = resolveCustomExercisePrimaryMuscleGroup({
      exerciseId: "custom_u1_cable_bicep_curl",
      name: "Cable Bicep Curl",
      equipment: "Cable",
      primary: "Other",
      loggingType: "weight_reps",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(group).toBe("biceps");
  });
});
