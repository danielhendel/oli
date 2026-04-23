import { describe, expect, it } from "@jest/globals";
import type { ExerciseCatalogItem } from "../catalog";
import { bundledCatalogItemsForWorkoutPicker } from "../pickerBundledCatalog";

const sample: ExerciseCatalogItem[] = [
  { exerciseId: "bench_press", name: "Bench Press", aliases: [] },
  { exerciseId: "deadlift", name: "Deadlift", aliases: [] },
];

describe("bundledCatalogItemsForWorkoutPicker", () => {
  it("returns full catalog when allowlist is undefined", () => {
    expect(bundledCatalogItemsForWorkoutPicker(sample, undefined)).toEqual(sample);
  });

  it("filters to allowlisted bundled ids only", () => {
    expect(bundledCatalogItemsForWorkoutPicker(sample, ["deadlift"])).toEqual([sample[1]]);
  });

  it("empty allowlist hides all bundled entries", () => {
    expect(bundledCatalogItemsForWorkoutPicker(sample, [])).toEqual([]);
  });

  it("picker merges custom entries after allowlist filtering (mirrors exercise picker)", () => {
    const custom: ExerciseCatalogItem = { exerciseId: "custom_1", name: "Custom Row", aliases: [] };
    const restricted = bundledCatalogItemsForWorkoutPicker(sample, ["bench_press"]);
    const merged = [...restricted, custom];
    expect(merged.some((x) => x.exerciseId === "custom_1")).toBe(true);
    expect(merged.some((x) => x.exerciseId === "deadlift")).toBe(false);
  });
});
