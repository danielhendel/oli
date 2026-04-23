import { listMergedCustomExerciseRecords } from "../mergeCustomExerciseSources";
import * as exerciseDefinitionsApi from "@/lib/api/exerciseDefinitions";
import * as customExerciseStore from "../customExerciseStore";

jest.mock("@/lib/api/exerciseDefinitions", () => ({
  listExerciseDefinitions: jest.fn(),
}));

describe("listMergedCustomExerciseRecords", () => {
  beforeEach(() => {
    jest.spyOn(customExerciseStore, "listCustomExercises").mockReset();
    (exerciseDefinitionsApi.listExerciseDefinitions as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns local only when getIdToken is absent", async () => {
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

    const out = await listMergedCustomExerciseRecords("u1");
    expect(out).toHaveLength(1);
    expect(out[0]?.exerciseId).toBe("custom_u1_move");
    expect(exerciseDefinitionsApi.listExerciseDefinitions).not.toHaveBeenCalled();
  });

  it("merges remote over local on same id", async () => {
    jest.spyOn(customExerciseStore, "listCustomExercises").mockResolvedValue([
      {
        exerciseId: "custom_u1_move",
        name: "Local Name",
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
      json: {
        items: [
          {
            exerciseId: "custom_u1_move",
            name: "Server Name",
            equipment: "Cable",
            primary: "Back",
            loggingType: "weight_reps",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z",
          },
        ],
      },
    });

    const out = await listMergedCustomExerciseRecords("u1", async () => "tok");
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("Server Name");
  });

  it("falls back to local when API fails", async () => {
    jest.spyOn(customExerciseStore, "listCustomExercises").mockResolvedValue([
      {
        exerciseId: "custom_u1_only",
        name: "Only Local",
        equipment: "Machine",
        primary: "Legs",
        loggingType: "weight_reps",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    (exerciseDefinitionsApi.listExerciseDefinitions as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      kind: "http",
      error: "err",
      requestId: null,
    });

    const out = await listMergedCustomExerciseRecords("u1", async () => "tok");
    expect(out[0]?.name).toBe("Only Local");
  });
});
