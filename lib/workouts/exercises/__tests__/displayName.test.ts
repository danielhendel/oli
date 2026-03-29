import { loadCustomExerciseNameById, resolveExerciseDisplayName } from "../displayName";

jest.mock("../customExerciseStore", () => ({
  listCustomExercises: jest.fn(),
}));

const customExerciseStore = require("../customExerciseStore");

describe("exercise display name resolver", () => {
  beforeEach(() => {
    customExerciseStore.listCustomExercises.mockReset();
  });

  it("resolves standard exercise names from catalog", () => {
    const out = resolveExerciseDisplayName("bench_press");
    expect(out).toBe("Bench Press");
  });

  it("resolves custom exercise names from custom map", () => {
    const map = new Map([["custom_u1_my_press", "My Cable Press"]]);
    const out = resolveExerciseDisplayName("custom_u1_my_press", map);
    expect(out).toBe("My Cable Press");
  });

  it("does not leak internal custom ids when name cannot be resolved", () => {
    const out = resolveExerciseDisplayName("custom_1uwhcp4o_cable_external_rotation");
    expect(out).toBe("Custom exercise");
    expect(out.toLowerCase()).not.toContain("1uwhcp4o");
  });

  it("uses sane title-case fallback for unknown non-custom ids", () => {
    const out = resolveExerciseDisplayName("rear_delt_row");
    expect(out).toBe("Rear Delt Row");
  });

  it("loads custom exercise name map from storage", async () => {
    customExerciseStore.listCustomExercises.mockResolvedValue([
      {
        exerciseId: "custom_u1_my_press",
        name: "My Cable Press",
        equipment: "Cable",
        primary: "Back",
        loggingType: "weight_reps",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const map = await loadCustomExerciseNameById("u1");

    expect(map.get("custom_u1_my_press")).toBe("My Cable Press");
  });
});
