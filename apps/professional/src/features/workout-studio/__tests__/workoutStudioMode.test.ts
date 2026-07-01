import {
  getDefaultWorkoutStudioMode,
  UNTITLED_WORKOUT_TITLE,
} from "../useWorkoutStudioMode";
import {
  WORKOUT_STUDIO_MODE_IDS,
  WORKOUT_STUDIO_MODES,
} from "../workoutStudioNavigation";

describe("workout studio mode", () => {
  it('defaults untitled workout to overview', () => {
    expect(getDefaultWorkoutStudioMode(UNTITLED_WORKOUT_TITLE)).toBe("overview");
  });

  it("defaults empty title to overview", () => {
    expect(getDefaultWorkoutStudioMode("")).toBe("overview");
    expect(getDefaultWorkoutStudioMode("   ")).toBe("overview");
  });

  it("defaults real workout title to blocks", () => {
    expect(getDefaultWorkoutStudioMode("Upper Body Strength — Session 1")).toBe("blocks");
  });

  it("lists overview, stats, and blocks modes in order", () => {
    expect(WORKOUT_STUDIO_MODE_IDS).toEqual(["overview", "stats", "blocks"]);
    expect(WORKOUT_STUDIO_MODES.map((mode) => mode.id)).toEqual([
      "overview",
      "stats",
      "blocks",
    ]);
  });

  it("does not include save or assign modes", () => {
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("save");
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("assign");
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("preview");
    expect(WORKOUT_STUDIO_MODE_IDS).not.toContain("library");
  });
});
