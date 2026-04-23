import { migrateLocalCustomExercisesToBackend } from "../migrateCustomExercisesToBackend";
import * as exerciseDefinitionsApi from "@/lib/api/exerciseDefinitions";
import * as customExerciseStore from "../customExerciseStore";

jest.mock("@/lib/api/exerciseDefinitions", () => ({
  listExerciseDefinitions: jest.fn(),
  createExerciseDefinition: jest.fn(),
}));

describe("migrateLocalCustomExercisesToBackend", () => {
  beforeEach(() => {
    jest.spyOn(customExerciseStore, "listCustomExercises").mockReset();
    (exerciseDefinitionsApi.listExerciseDefinitions as jest.Mock).mockReset();
    (exerciseDefinitionsApi.createExerciseDefinition as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("no-ops without token", async () => {
    const out = await migrateLocalCustomExercisesToBackend("u1", async () => null);
    expect(out).toEqual({ migrated: 0, skippedAlreadyOnServer: 0, failed: 0 });
  });

  it("migrates missing rows", async () => {
    jest.spyOn(customExerciseStore, "listCustomExercises").mockResolvedValue([
      {
        exerciseId: "custom_u1_move",
        name: "Move",
        equipment: "Cable",
        primary: "Back",
        loggingType: "weight_reps",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    (exerciseDefinitionsApi.listExerciseDefinitions as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: { items: [] },
    });
    (exerciseDefinitionsApi.createExerciseDefinition as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      requestId: null,
      json: {},
    });

    const out = await migrateLocalCustomExercisesToBackend("u1", async () => "tok");
    expect(out.migrated).toBe(1);
    expect(out.skippedAlreadyOnServer).toBe(0);
    expect(exerciseDefinitionsApi.createExerciseDefinition).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ exerciseId: "custom_u1_move" }),
    );
  });
});
