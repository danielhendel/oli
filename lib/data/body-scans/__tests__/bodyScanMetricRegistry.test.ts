/**
 * Canonical Body Scan metric registry invariants (Phase A).
 */
import { describe, expect, it } from "@jest/globals";

import {
  bodyScanMetricIdSchema,
  bodyScanMethodSchema,
  bodyScanRegionSchema,
  bodyScanScoringConstructIdSchema,
} from "@oli/contracts";

import {
  BODY_SCAN_BIA_BOUNDARY,
  BODY_SCAN_DXA_CAPABILITIES,
  bodyScanDxaMayEmit,
} from "../bodyScanCapabilities";
import {
  BODY_SCAN_METRIC_ALIASES,
  resolveBodyScanMetricAlias,
  resolveBodyScanMetricRef,
} from "../bodyScanMetricAliases";
import {
  BODY_SCAN_METRIC_REGISTRY,
  bodyScanMetricRegistryList,
  isRegionAllowedForMetric,
} from "../bodyScanMetricRegistry";
import { validateBodyScanExtractedFieldsAgainstRegistry } from "../validateBodyScanAgainstRegistry";
import { extractLiveLeanRxDxa } from "../extraction/liveLeanRxDxaExtractor";
import {
  syntheticDxaAdapterInput,
  syntheticDxaSingleSpaceLbsInput,
} from "../__fixtures__/liveLeanRxDxaSynthetic";

describe("BODY_SCAN_METRIC_REGISTRY", () => {
  it("has unique keys covering every contract metric id", () => {
    const keys = bodyScanMetricRegistryList().map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const id of bodyScanMetricIdSchema.options) {
      expect(BODY_SCAN_METRIC_REGISTRY[id]).toBeDefined();
      expect(BODY_SCAN_METRIC_REGISTRY[id].key).toBe(id);
    }
  });

  it("requires valid canonical units, groups, and product statuses", () => {
    for (const def of bodyScanMetricRegistryList()) {
      expect(def.canonicalUnit).toBeTruthy();
      expect(def.supportedSourceUnits.length).toBeGreaterThan(0);
      expect(def.supportedSourceUnits).toContain(def.canonicalUnit);
      expect(def.continuousTrendEligible).toBe(false);
      expect(def.diagnosticClassification).toBe(false);
      expect(["overview", "fat_distribution", "regional_composition", "regional_lean", "bone", "source"]).toContain(
        def.group,
      );
      expect(["core_v1", "optional_v1", "advanced_v1", "deferred", "future"]).toContain(def.productStatus);
      for (const region of def.allowedRegions) {
        expect(bodyScanRegionSchema.options).toContain(region);
      }
      for (const method of def.allowedMethods) {
        expect(bodyScanMethodSchema.options).toContain(method);
      }
      for (const tag of def.scoringConstructEligibility) {
        expect(bodyScanScoringConstructIdSchema.options).toContain(tag);
      }
    }
  });

  it("marks VAT, A/G, BMD, T/Z, FFM, and SMM as sourceReportedOnly", () => {
    expect(BODY_SCAN_METRIC_REGISTRY.visceral_fat_mass.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.visceral_fat_volume.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.android_gynoid_ratio.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.bone_mineral_density.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.t_score.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.z_score.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.fat_free_mass.sourceReportedOnly).toBe(true);
    expect(BODY_SCAN_METRIC_REGISTRY.skeletal_muscle_mass.sourceReportedOnly).toBe(true);
  });

  it("defers T/Z UI and keeps SMM future / DXA-non-emittable", () => {
    expect(BODY_SCAN_METRIC_REGISTRY.t_score.uiEnabled).toBe(false);
    expect(BODY_SCAN_METRIC_REGISTRY.z_score.uiEnabled).toBe(false);
    expect(BODY_SCAN_METRIC_REGISTRY.t_score.productStatus).toBe("deferred");
    expect(BODY_SCAN_METRIC_REGISTRY.z_score.productStatus).toBe("deferred");
    expect(BODY_SCAN_METRIC_REGISTRY.skeletal_muscle_mass.productStatus).toBe("future");
    expect(bodyScanDxaMayEmit("skeletal_muscle_mass")).toBe(false);
    expect(bodyScanDxaMayEmit("t_score")).toBe(false);
    expect(bodyScanDxaMayEmit("z_score")).toBe(false);
    expect(bodyScanDxaMayEmit("lean_mass")).toBe(true);
  });

  it("never equates lean_mass with skeletal_muscle_mass", () => {
    expect(BODY_SCAN_METRIC_REGISTRY.lean_mass.key).not.toBe("skeletal_muscle_mass");
    expect(BODY_SCAN_METRIC_REGISTRY.skeletal_muscle_mass.allowedMethods).toEqual(["bia"]);
    expect(BODY_SCAN_METRIC_REGISTRY.lean_mass.allowedMethods).not.toEqual(["bia"]);
  });

  it("never allows VAT mass and volume to share inference aliases", () => {
    expect(BODY_SCAN_METRIC_REGISTRY.visceral_fat_mass.key).not.toBe(
      BODY_SCAN_METRIC_REGISTRY.visceral_fat_volume.key,
    );
    expect(BODY_SCAN_METRIC_REGISTRY.visceral_fat_mass.canonicalUnit).not.toBe(
      BODY_SCAN_METRIC_REGISTRY.visceral_fat_volume.canonicalUnit,
    );
  });

  it("exposes scoring eligibility metadata without weights", () => {
    expect(BODY_SCAN_METRIC_REGISTRY.visceral_fat_volume.scoringConstructEligibility).toContain("H1");
    expect(BODY_SCAN_METRIC_REGISTRY.fat_percent.scoringConstructEligibility).toEqual(
      expect.arrayContaining(["H2", "P3"]),
    );
    expect(BODY_SCAN_METRIC_REGISTRY.fat_free_mass.scoringConstructEligibility).toEqual(
      expect.arrayContaining(["H3", "P1"]),
    );
    expect(BODY_SCAN_METRIC_REGISTRY.lean_mass.scoringConstructEligibility).toContain("P2");
    expect(BODY_SCAN_METRIC_REGISTRY.android_gynoid_ratio.scoringConstructEligibility).toContain("H4");
    expect(BODY_SCAN_METRIC_REGISTRY.bone_mineral_density.scoringConstructEligibility).toEqual([]);
    // No weight fields on definitions.
    for (const def of bodyScanMetricRegistryList()) {
      expect(def).not.toHaveProperty("scoreWeight");
      expect(def).not.toHaveProperty("weight");
    }
  });
});

describe("BODY_SCAN_DXA_CAPABILITIES", () => {
  it("references only registry metrics", () => {
    for (const cap of BODY_SCAN_DXA_CAPABILITIES) {
      expect(BODY_SCAN_METRIC_REGISTRY[cap.metricId]).toBeDefined();
    }
  });

  it("keeps BIA boundary from claiming DXA-only metrics", () => {
    for (const id of BODY_SCAN_BIA_BOUNDARY.mustNotPopulate) {
      expect(BODY_SCAN_METRIC_REGISTRY[id].allowedMethods).not.toContain("bia");
    }
  });
});

describe("bodyScanMetricAliases", () => {
  it("maps combinatorial and alternate names to metric+region", () => {
    expect(resolveBodyScanMetricAlias("right_arm_lean_mass")).toEqual({
      metricId: "lean_mass",
      defaultRegion: "right_arm",
    });
    expect(resolveBodyScanMetricAlias("body_fat_percent")).toEqual({
      metricId: "fat_percent",
      defaultRegion: "total",
    });
    expect(resolveBodyScanMetricAlias("android_fat_percent")).toEqual({
      metricId: "fat_percent",
      defaultRegion: "android",
    });
    expect(resolveBodyScanMetricRef({ fieldId: "left_leg:lean_mass" })).toEqual({
      metricId: "lean_mass",
      region: "left_leg",
    });
  });

  it("does not invent unknown aliases", () => {
    expect(resolveBodyScanMetricAlias("not_a_real_metric")).toBeNull();
    expect(Object.keys(BODY_SCAN_METRIC_ALIASES).length).toBeGreaterThan(5);
  });
});

describe("DXA adapter → registry mapping", () => {
  it("emits only registry-valid fields for synthetic DXA fixtures", () => {
    for (const input of [syntheticDxaAdapterInput(), syntheticDxaSingleSpaceLbsInput()]) {
      const result = extractLiveLeanRxDxa(input);
      const validation = validateBodyScanExtractedFieldsAgainstRegistry({
        fields: result.fields,
        method: "dxa",
        enforceDxaEmit: true,
      });
      expect(validation.unmappedMetricCount).toBe(0);
      expect(validation.invalidRegionCount).toBe(0);
      expect(validation.invalidUnitCount).toBe(0);
      expect(validation.ok).toBe(true);
      for (const field of result.fields) {
        expect(isRegionAllowedForMetric(field.metricId, field.region)).toBe(true);
        expect(bodyScanDxaMayEmit(field.metricId)).toBe(true);
        expect(["t_score", "z_score", "skeletal_muscle_mass"]).not.toContain(field.metricId);
      }
    }
  });
});
