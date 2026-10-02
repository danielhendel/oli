import { describe, expect, it } from "@jest/globals";

import {
  BODY_SCAN_METRIC_LABELS,
  bodyScanComparabilityGroup,
  bodyScanMetricDisplayLabel,
  bodyScanSectionForMetric,
  bodyScanUnitSuffix,
  isLateralRegion,
} from "../bodyScanMetricCatalog";

describe("bodyScanMetricCatalog", () => {
  it("keeps Lean Mass labelled as Lean Mass", () => {
    expect(BODY_SCAN_METRIC_LABELS.lean_mass).toBe("Lean Mass");
    expect(BODY_SCAN_METRIC_LABELS.lean_mass.toLowerCase()).not.toContain("muscle");
    expect(BODY_SCAN_METRIC_LABELS.lean_mass.toLowerCase()).not.toContain("smm");
    // SMM is a separate future metric — never an alias of lean_mass.
    expect(BODY_SCAN_METRIC_LABELS.skeletal_muscle_mass).toBe("Skeletal Muscle Mass");
    expect(BODY_SCAN_METRIC_LABELS.skeletal_muscle_mass).not.toBe(BODY_SCAN_METRIC_LABELS.lean_mass);
  });

  it("mirrors canonical registry labels (single label source)", () => {
    expect(BODY_SCAN_METRIC_LABELS.fat_percent).toBe("Body Fat");
    expect(BODY_SCAN_METRIC_LABELS.bone_mineral_density).toBe("Total Body BMD");
    expect(BODY_SCAN_METRIC_LABELS.fat_free_mass).toBe("Fat-Free Mass");
  });

  it("routes metrics to the designed sections", () => {
    expect(bodyScanSectionForMetric({ metricId: "fat_percent", region: "total" })).toBe("overview");
    expect(bodyScanSectionForMetric({ metricId: "visceral_fat_mass", region: "total" })).toBe(
      "fat_distribution",
    );
    expect(bodyScanSectionForMetric({ metricId: "visceral_fat_volume", region: "total" })).toBe(
      "fat_distribution",
    );
    expect(bodyScanSectionForMetric({ metricId: "fat_free_mass", region: "total" })).toBe("overview");
    expect(bodyScanSectionForMetric({ metricId: "fat_percent", region: "android" })).toBe(
      "fat_distribution",
    );
    expect(bodyScanSectionForMetric({ metricId: "fat_mass", region: "trunk" })).toBe(
      "regional_composition",
    );
    expect(bodyScanSectionForMetric({ metricId: "lean_mass", region: "left_arm" })).toBe(
      "regional_lean_balance",
    );
    expect(bodyScanSectionForMetric({ metricId: "bone_mineral_density", region: "total" })).toBe(
      "total_body_bone",
    );
  });

  it("labels regional metrics with their region", () => {
    expect(bodyScanMetricDisplayLabel({ metricId: "fat_percent", region: "total" })).toBe(
      "Body Fat",
    );
    expect(bodyScanMetricDisplayLabel({ metricId: "lean_mass", region: "left_leg" })).toBe(
      "Left Leg Lean Mass",
    );
  });

  it("keeps comparability groups method- and vendor-scoped", () => {
    const dxa = bodyScanComparabilityGroup({
      method: "dxa",
      manufacturer: "GE Lunar",
      metricId: "fat_percent",
      region: "total",
    });
    const bia = bodyScanComparabilityGroup({
      method: "bia",
      manufacturer: "InBody",
      metricId: "fat_percent",
      region: "total",
    });
    expect(dxa).toBe("dxa:ge-lunar:fat_percent:total");
    expect(dxa).not.toBe(bia);
  });

  it("falls back to an explicit unknown vendor", () => {
    expect(
      bodyScanComparabilityGroup({
        method: "other",
        manufacturer: null,
        metricId: "fat_mass",
        region: "total",
      }),
    ).toBe("other:unknown:fat_mass:total");
  });

  it("formats units", () => {
    expect(bodyScanUnitSuffix("percent")).toBe("%");
    expect(bodyScanUnitSuffix("g_per_cm2")).toBe(" g/cm²");
    expect(bodyScanUnitSuffix("cm3")).toBe(" cm³");
    expect(bodyScanUnitSuffix("ratio")).toBe("");
  });

  it("identifies lateral regions", () => {
    expect(isLateralRegion("left_arm")).toBe(true);
    expect(isLateralRegion("trunk")).toBe(false);
  });
});
