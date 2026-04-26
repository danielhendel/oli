import { resolveAddExerciseTargetBlockId } from "../logAddExerciseTarget";

describe("resolveAddExerciseTargetBlockId", () => {
  it("returns undefined when there are no blocks", () => {
    expect(resolveAddExerciseTargetBlockId([], null)).toBeUndefined();
    expect(resolveAddExerciseTargetBlockId([], "b1")).toBeUndefined();
  });

  it("uses selected block when it is still present", () => {
    expect(resolveAddExerciseTargetBlockId(["a", "b", "c"], "b")).toBe("b");
  });

  it("falls back to last block when nothing is selected", () => {
    expect(resolveAddExerciseTargetBlockId(["a", "b"], null)).toBe("b");
  });

  it("falls back to last block when selected id is stale", () => {
    expect(resolveAddExerciseTargetBlockId(["a", "b"], "deleted")).toBe("b");
  });
});
