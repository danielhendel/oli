import { describe, expect, it } from "@jest/globals";
import type { BodyScanDetailDto, BodyScanMetricDto } from "@oli/contracts";

import { buildBodyScanDetailSections } from "../buildBodyScanDetailSections";

function metric(partial: Partial<BodyScanMetricDto> & Pick<BodyScanMetricDto, "metricId" | "region" | "value" | "unit">): BodyScanMetricDto {
  return {
    rawLabel: null,
    corrected: false,
    ...partial,
  };
}

const SCAN: BodyScanDetailDto = {
  id: "scan_1",
  scanType: "dxa",
  method: "dxa",
  status: "verified",
  statusLabel: "Results available.",
  performedAt: "2026-03-04T00:00:00.000Z",
  uploadedAt: "2026-03-05T12:00:00.000Z",
  deviceLabel: "GE Lunar iDXA",
  adapterLabel: "Live Lean Rx DXA v1.0.0",
  sourceFilename: "body-scan.pdf",
  metrics: [
    metric({ metricId: "fat_percent", region: "total", value: 21.4, unit: "percent" }),
    metric({ metricId: "lean_mass", region: "total", value: 58.2, unit: "kg" }),
    metric({ metricId: "visceral_fat_mass", region: "total", value: 0.41, unit: "kg" }),
    metric({ metricId: "fat_percent", region: "android", value: 24.9, unit: "percent" }),
    metric({ metricId: "fat_mass", region: "trunk", value: 8.1, unit: "kg" }),
    metric({ metricId: "lean_mass", region: "left_arm", value: 3.2, unit: "kg" }),
    metric({ metricId: "lean_mass", region: "right_arm", value: 3.5, unit: "kg", corrected: true }),
    metric({ metricId: "bone_mineral_density", region: "total", value: 1.234, unit: "g_per_cm2" }),
  ],
  safeWarnings: [],
  canReview: true,
  canRetry: true,
  canDelete: true,
  canViewOriginal: true,
};

describe("buildBodyScanDetailSections", () => {
  it("builds the designed sections in order", () => {
    const sections = buildBodyScanDetailSections(SCAN);
    expect(sections.map((s) => s.id)).toEqual([
      "overview",
      "fat_distribution",
      "regional_composition",
      "regional_lean_balance",
      "total_body_bone",
      "source",
    ]);
  });

  it("puts lateral lean mass only in the balance section, with a difference row", () => {
    const sections = buildBodyScanDetailSections(SCAN);
    const regional = sections.find((s) => s.id === "regional_composition");
    expect(regional?.rows.map((r) => r.label)).toEqual(["Trunk Fat Mass"]);

    const balance = sections.find((s) => s.id === "regional_lean_balance");
    expect(balance?.rows.map((r) => r.label)).toEqual([
      "Left Arm Lean Mass",
      "Right Arm Lean Mass",
      "Right Arm − Left Arm Difference",
    ]);
    expect(balance?.rows[2]?.valueText).toBe("+0.3 kg");
  });

  it("carries correction flags through to rows", () => {
    const sections = buildBodyScanDetailSections(SCAN);
    const balance = sections.find((s) => s.id === "regional_lean_balance");
    expect(balance?.rows.find((r) => r.label === "Right Arm Lean Mass")?.corrected).toBe(true);
  });

  it("omits sections with no reported metrics instead of showing zeros", () => {
    const sparse: BodyScanDetailDto = {
      ...SCAN,
      metrics: [metric({ metricId: "fat_percent", region: "total", value: 30, unit: "percent" })],
    };
    const sections = buildBodyScanDetailSections(sparse);
    expect(sections.map((s) => s.id)).toEqual(["overview", "source"]);
    const values = sections.flatMap((s) => s.rows.map((r) => r.valueText));
    expect(values).not.toContain("0.0 kg");
  });

  it("renders missing source values as null rather than placeholder text", () => {
    const sections = buildBodyScanDetailSections({
      ...SCAN,
      deviceLabel: null,
      performedAt: null,
    });
    const source = sections.find((s) => s.id === "source");
    expect(source?.rows.find((r) => r.key === "source_device")?.valueText).toBeNull();
    expect(source?.rows.find((r) => r.key === "source_performed_at")?.valueText).toBeNull();
  });

  it("formats bone density with report precision", () => {
    const sections = buildBodyScanDetailSections(SCAN);
    const bone = sections.find((s) => s.id === "total_body_bone");
    expect(bone?.rows[0]?.valueText).toBe("1.234 g/cm²");
  });
});
