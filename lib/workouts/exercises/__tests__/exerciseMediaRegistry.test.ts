import {
  getBundledExerciseAsset,
  hasBundledExerciseAsset,
  getExerciseMedia,
  hasLoopVideo,
} from "../media/registry";

describe("exercise media registry", () => {
  it("returns placeholder for unknown ids", () => {
    const asset = getBundledExerciseAsset("unknown_exercise_id");
    // Metro returns a number; Jest asset stub may return an object
    expect(asset != null && (typeof asset === "number" || typeof asset === "object")).toBe(true);
  });

  it("detects known ids", () => {
    expect(hasBundledExerciseAsset("bench_press")).toBe(true);
  });

  it("returns false for unknown ids so UI can show neutral placeholder", () => {
    expect(hasBundledExerciseAsset("unknown_exercise")).toBe(false);
  });

  it("getExerciseMedia returns thumbnail and optional loopVideo for bench_press", () => {
    const media = getExerciseMedia("bench_press");
    expect(media.thumbnail).toBeDefined();
    expect(media.loopVideo).toBeDefined();
    expect(
      media.thumbnail != null && (typeof media.thumbnail === "number" || typeof media.thumbnail === "object"),
    ).toBe(true);
    expect(
      media.loopVideo != null && (typeof media.loopVideo === "number" || typeof media.loopVideo === "object"),
    ).toBe(true);
  });

  it("getExerciseMedia returns thumbnail only for exercises without loop video", () => {
    const media = getExerciseMedia("squat");
    expect(media.thumbnail).toBeDefined();
    expect(media.loopVideo).toBeUndefined();
  });

  it("getExerciseMedia returns image fallback for unknown exercise", () => {
    const media = getExerciseMedia("unknown_exercise_id");
    expect(media.thumbnail).toBeDefined();
    expect(media.loopVideo).toBeUndefined();
  });

  it("hasLoopVideo is true only for bench_press", () => {
    expect(hasLoopVideo("bench_press")).toBe(true);
    expect(hasLoopVideo("squat")).toBe(false);
    expect(hasLoopVideo("unknown")).toBe(false);
  });
});
