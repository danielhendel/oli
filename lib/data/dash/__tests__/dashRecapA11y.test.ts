import { describe, expect, it } from "@jest/globals";
import { dashRecapRowAccessibilityLabel } from "../dashRecapA11y";
import type { DashRecapRow } from "../dashRecapViewModel";

describe("dashRecapRowAccessibilityLabel", () => {
  it("appends placement disclaimer when bar is placement", () => {
    const row: DashRecapRow = {
      id: "steps",
      label: "Steps",
      valueText: "5000",
      isPlaceholder: false,
      bar: { kind: "placement", markerPosition01: 0.5 },
    };
    expect(dashRecapRowAccessibilityLabel(row)).toContain("Not a health rating");
    expect(dashRecapRowAccessibilityLabel(row)).toContain("50 percent");
  });

  it("omits placement line when bar is none", () => {
    const row: DashRecapRow = {
      id: "weight",
      label: "Weight",
      valueText: "70 kg",
      isPlaceholder: false,
      bar: { kind: "none" },
    };
    expect(dashRecapRowAccessibilityLabel(row)).not.toContain("Not a health rating");
  });
});
