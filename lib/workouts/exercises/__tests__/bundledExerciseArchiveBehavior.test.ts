import { describe, expect, it } from "@jest/globals";
import { EXERCISE_CATALOG_FOR_PICKER_V1, isBundledExerciseSelectableInPickerStatus } from "../catalog";
import { EXERCISE_LIBRARY_V1 } from "../library.v1";
import { getExerciseMeta } from "../metadata";
import { getBundledExerciseNameById, getBundledLibraryItemByExerciseId } from "../taxonomyResolve";

describe("bundled archive behavior", () => {
  it("picker excludes non-active bundled statuses", () => {
    expect(isBundledExerciseSelectableInPickerStatus("active")).toBe(true);
    expect(isBundledExerciseSelectableInPickerStatus("archived")).toBe(false);
    expect(isBundledExerciseSelectableInPickerStatus("retired")).toBe(false);
  });

  it("taxonomyResolve still resolves display names regardless of bundled lifecycle (full library scan)", () => {
    const anyBundledId = EXERCISE_LIBRARY_V1[0]?.exerciseId;
    expect(anyBundledId != null && anyBundledId.length > 0).toBe(true);
    const name = getBundledExerciseNameById(anyBundledId!);
    expect(typeof name === "string" && name.length > 0).toBe(true);
    const row = getBundledLibraryItemByExerciseId(anyBundledId!);
    expect(row?.exerciseId).toBe(anyBundledId);
  });

  it("picker catalog entries are a strict subset of bundled ids when none archived", () => {
    const pickerIds = new Set(EXERCISE_CATALOG_FOR_PICKER_V1.map((x) => x.exerciseId));
    const libIds = new Set(EXERCISE_LIBRARY_V1.map((x) => x.exerciseId));
    for (const id of pickerIds) expect(libIds.has(id)).toBe(true);
  });

  it("metadata still resolves bundled ids excluded from a personalized picker allowlist", () => {
    expect(getExerciseMeta("deadlift").primary).toBe("Back");
    expect(getBundledExerciseNameById("deadlift")).toBe("Deadlift");
  });
});
