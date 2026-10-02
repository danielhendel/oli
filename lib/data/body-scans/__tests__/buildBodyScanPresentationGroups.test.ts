/**
 * Registry-driven Body Scan presentation groups (Phase D/E).
 */
import { describe, expect, it } from "@jest/globals";
import type { BodyScanDetailDto, BodyScanMetricDto, BodyScanReviewFieldDto } from "@oli/contracts";

import {
  BODY_SCAN_METRIC_REGISTRY,
} from "../bodyScanMetricRegistry";
import {
  BODY_SCAN_PRESENTATION_GROUP_ORDER,
  buildBodyScanPresentationGroups,
  buildBodyScanPresentationGroupsFromDetail,
  buildBodyScanPresentationGroupsFromReviewFields,
  flattenPresentationGroupItems,
  isMetricVisibleInDetail,
  isMetricVisibleInReview,
  normalizeDetailMetricsForPresentation,
} from "../buildBodyScanPresentationGroups";
import { bodyScanMetricDisplayLabel, bodyScanMetricLabel } from "../bodyScanMetricCatalog";

function metric(
  partial: Partial<BodyScanMetricDto> &
    Pick<BodyScanMetricDto, "metricId" | "region" | "value" | "unit">,
): BodyScanMetricDto {
  return { rawLabel: null, corrected: false, ...partial };
}

function field(
  partial: Partial<BodyScanReviewFieldDto> &
    Pick<BodyScanReviewFieldDto, "fieldId" | "metricId" | "region" | "unit">,
): BodyScanReviewFieldDto {
  return {
    label: bodyScanMetricDisplayLabel({ metricId: partial.metricId, region: partial.region }),
    rawValue: "1",
    normalizedValue: 1,
    confidence: 0.9,
    requiresReview: false,
    ...partial,
  };
}

const SCAN: BodyScanDetailDto = {
  id: "scan_1",
  scanType: "dxa",
  method: "dxa",
  status: "verified",
  statusLabel: "Measurements saved",
  performedAt: "2026-03-04T00:00:00.000Z",
  uploadedAt: "2026-03-05T12:00:00.000Z",
  deviceLabel: "GE Lunar iDXA",
  adapterLabel: "Live Lean Rx DXA v1.0.0",
  sourceFilename: "Original DXA report",
  metrics: [
    metric({ metricId: "fat_percent", region: "total", value: 21.4, unit: "percent" }),
    metric({ metricId: "lean_mass", region: "total", value: 58.2, unit: "kg" }),
    metric({ metricId: "visceral_fat_mass", region: "total", value: 0.41, unit: "kg" }),
    metric({ metricId: "visceral_fat_volume", region: "total", value: 912, unit: "cm3" }),
    metric({ metricId: "fat_percent", region: "android", value: 24.9, unit: "percent" }),
    metric({ metricId: "fat_mass", region: "trunk", value: 8.1, unit: "kg" }),
    metric({ metricId: "lean_mass", region: "left_arm", value: 3.2, unit: "kg" }),
    metric({ metricId: "lean_mass", region: "right_arm", value: 3.5, unit: "kg", corrected: true }),
    metric({ metricId: "bone_mineral_density", region: "total", value: 1.234, unit: "g_per_cm2" }),
    metric({ metricId: "bone_mineral_content", region: "total", value: 2480, unit: "g" }),
    // Deferred / future — must never render
    metric({ metricId: "t_score", region: "total", value: -0.5, unit: "score" }),
    metric({ metricId: "z_score", region: "total", value: 0.2, unit: "score" }),
    metric({ metricId: "skeletal_muscle_mass", region: "total", value: 30, unit: "kg" }),
  ],
  safeWarnings: [],
  canReview: false,
  canRetry: true,
  canDelete: true,
  canViewOriginal: true,
};

describe("buildBodyScanPresentationGroups", () => {
  it("uses canonical registry labels", () => {
    expect(bodyScanMetricLabel("fat_percent")).toBe("Body Fat");
    expect(bodyScanMetricLabel("bone_mineral_density")).toBe("Total Body BMD");
    expect(bodyScanMetricLabel("lean_mass")).toBe("Lean Mass");
    expect(bodyScanMetricLabel("fat_free_mass")).toBe("Fat-Free Mass");
    expect(bodyScanMetricDisplayLabel({ metricId: "fat_percent", region: "total" })).toBe(
      "Body Fat",
    );
    expect(bodyScanMetricDisplayLabel({ metricId: "bone_mineral_density", region: "total" })).toBe(
      "Total Body BMD",
    );
    expect(BODY_SCAN_METRIC_REGISTRY.fat_percent.label).not.toBe("Fat");
  });

  it("keeps BMD scientific copy non-diagnostic", () => {
    const copy = BODY_SCAN_METRIC_REGISTRY.bone_mineral_density.description.toLowerCase();
    expect(BODY_SCAN_METRIC_REGISTRY.bone_mineral_density.label).toContain("Total Body");
    expect(copy).toContain("total body");
    expect(copy).toContain("not the same as a diagnostic hip or spine");
    expect(copy).not.toContain("osteoporosis diagnosis");
    expect(BODY_SCAN_METRIC_REGISTRY.bone_mineral_density.diagnosticClassification).toBe(false);
  });

  it("hides deferred T/Z and future SMM on both surfaces", () => {
    expect(isMetricVisibleInReview("t_score")).toBe(false);
    expect(isMetricVisibleInDetail("t_score")).toBe(false);
    expect(isMetricVisibleInReview("z_score")).toBe(false);
    expect(isMetricVisibleInDetail("z_score")).toBe(false);
    expect(isMetricVisibleInReview("skeletal_muscle_mass")).toBe(false);
    expect(isMetricVisibleInDetail("skeletal_muscle_mass")).toBe(false);
    expect(isMetricVisibleInReview("lean_mass")).toBe(true);
  });

  it("groups Detail metrics in registry order independent of input order", () => {
    const shuffled: BodyScanDetailDto = {
      ...SCAN,
      metrics: [...SCAN.metrics].reverse(),
    };
    const a = buildBodyScanPresentationGroupsFromDetail(SCAN);
    const b = buildBodyScanPresentationGroupsFromDetail(shuffled);
    expect(a.map((g) => g.group)).toEqual(b.map((g) => g.group));
    expect(flattenPresentationGroupItems(a).map((i) => i.key)).toEqual(
      flattenPresentationGroupItems(b).map((i) => i.key),
    );
    expect(a.map((g) => g.group)).toEqual([
      "overview",
      "fat_distribution",
      "regional_composition",
      "regional_lean",
      "bone",
      "source",
    ]);
  });

  it("places overview, VAT, regional, lean, and bone correctly", () => {
    const groups = buildBodyScanPresentationGroupsFromDetail(SCAN);
    const overview = groups.find((g) => g.group === "overview");
    expect(overview?.items.map((i) => i.label)).toEqual(["Body Fat", "Lean Mass"]);

    const fat = groups.find((g) => g.group === "fat_distribution");
    expect(fat?.items.map((i) => i.label)).toEqual([
      "Visceral Fat Mass",
      "Visceral Fat Volume",
      "Android Body Fat",
    ]);

    const regional = groups.find((g) => g.group === "regional_composition");
    expect(regional?.regionBlocks.map((b) => b.title)).toEqual(["Trunk"]);
    expect(regional?.regionBlocks[0]?.items.map((i) => i.label)).toEqual(["Fat Mass"]);

    const lean = groups.find((g) => g.group === "regional_lean");
    expect(lean?.regionBlocks.map((b) => b.title)).toEqual(["Right Arm", "Left Arm"]);
    expect(lean?.regionBlocks.map((b) => b.items[0]?.label)).toEqual(["Lean Mass", "Lean Mass"]);
    expect(lean?.items.map((i) => i.label)).toEqual(["Right Arm − Left Arm Difference"]);

    const bone = groups.find((g) => g.group === "bone");
    expect(bone?.items.map((i) => i.label)).toEqual([
      "Bone Mineral Content",
      "Total Body BMD",
    ]);
    expect(bone?.items.find((i) => i.metricId === "bone_mineral_density")?.valueText).toBe(
      "1.234 g/cm²",
    );
  });

  it("never surfaces T/Z or SMM even when present on the DTO", () => {
    const labels = flattenPresentationGroupItems(
      buildBodyScanPresentationGroupsFromDetail(SCAN),
    ).map((i) => i.label);
    expect(labels.some((l) => /t-score|z-score|skeletal muscle/i.test(l))).toBe(false);
  });

  it("omits missing optional metrics instead of inventing zeros", () => {
    const sparse: BodyScanDetailDto = {
      ...SCAN,
      metrics: [metric({ metricId: "fat_percent", region: "total", value: 30, unit: "percent" })],
    };
    const groups = buildBodyScanPresentationGroupsFromDetail(sparse);
    expect(groups.map((g) => g.group)).toEqual(["overview", "source"]);
    const values = flattenPresentationGroupItems(groups).map((i) => i.valueText);
    expect(values).not.toContain("0.0 kg");
    expect(values).not.toContain("0");
  });

  it("builds source from metadata only (no physiological metrics)", () => {
    const source = buildBodyScanPresentationGroupsFromDetail(SCAN).find((g) => g.group === "source");
    expect(source?.items.map((i) => i.label)).toEqual([
      "Method",
      "Scan date",
      "Device",
      "Verification",
      "Report",
    ]);
    expect(source?.items.find((i) => i.key === "source_report")?.valueText).toBe(
      "Original DXA report",
    );
    expect(source?.items.find((i) => i.key === "source_method")?.valueText).toBe("DXA");
  });

  it("groups Review fields independently of candidate order", () => {
    const fields: BodyScanReviewFieldDto[] = [
      field({ fieldId: "total:bone_mineral_density", metricId: "bone_mineral_density", region: "total", unit: "g_per_cm2", normalizedValue: 1.186 }),
      field({ fieldId: "total:fat_percent", metricId: "fat_percent", region: "total", unit: "percent", normalizedValue: 24.8 }),
      field({ fieldId: "right_arm:lean_mass", metricId: "lean_mass", region: "right_arm", unit: "kg", normalizedValue: 3.1 }),
      field({ fieldId: "total:visceral_fat_volume", metricId: "visceral_fat_volume", region: "total", unit: "cm3", normalizedValue: 912 }),
      field({ fieldId: "total:t_score", metricId: "t_score", region: "total", unit: "score", normalizedValue: -1 }),
    ];
    const reversed = [...fields].reverse();
    const a = buildBodyScanPresentationGroupsFromReviewFields(fields);
    const b = buildBodyScanPresentationGroupsFromReviewFields(reversed);
    expect(a.map((g) => g.group)).toEqual(b.map((g) => g.group));
    expect(flattenPresentationGroupItems(a).map((i) => i.key)).toEqual(
      flattenPresentationGroupItems(b).map((i) => i.key),
    );
    expect(a.map((g) => g.group)).toEqual([
      "overview",
      "fat_distribution",
      "regional_lean",
      "bone",
    ]);
    expect(flattenPresentationGroupItems(a).some((i) => i.metricId === "t_score")).toBe(false);
  });

  it("never labels DXA lean as muscle", () => {
    const lean = flattenPresentationGroupItems(
      buildBodyScanPresentationGroupsFromDetail(SCAN),
    ).filter((i) => i.metricId === "lean_mass" && !i.key.startsWith("lean_balance_delta:"));
    for (const item of lean) {
      expect(item.label.toLowerCase()).toContain("lean");
      expect(item.label.toLowerCase()).not.toContain("muscle");
    }
  });

  it("exposes stable presentation group order contract", () => {
    expect(BODY_SCAN_PRESENTATION_GROUP_ORDER).toEqual([
      "overview",
      "fat_distribution",
      "regional_composition",
      "regional_lean",
      "bone",
    ]);
  });

  it("fails closed on unknown metric keys", () => {
    const groups = buildBodyScanPresentationGroups({
      measurements: normalizeDetailMetricsForPresentation([
        metric({ metricId: "fat_percent", region: "total", value: 20, unit: "percent" }),
      ]),
      surface: "detail",
      source: null,
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items[0]?.label).toBe("Body Fat");
  });
});
