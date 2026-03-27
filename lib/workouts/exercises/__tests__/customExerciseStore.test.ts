import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createCustomExercise,
  listCustomExercises,
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
});
