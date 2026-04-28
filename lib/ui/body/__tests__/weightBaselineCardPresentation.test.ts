import { describe, expect, it } from "@jest/globals";
import { buildWeightBaselineCardPresentation } from "../weightBaselineCardPresentation";

const readyModel = {
  kind: "ready" as const,
  currentWeightKg: 72.2,
  referenceWeightKg: 72,
  ninetyDayLowKg: 71.95,
  ninetyDayHighKg: 73.13,
  changeFromReferenceKg: 0.2,
  classification: "maintaining" as const,
  markerFill01: 0.4,
};

describe("buildWeightBaselineCardPresentation", () => {
  it("uses fixed 155-165 lb chart scale", () => {
    const p = buildWeightBaselineCardPresentation({
      model: readyModel,
      points: [],
      unit: "lb",
    });
    expect((p.chartMinKg * 2.2046226218).toFixed(1)).toBe("155.0");
    expect((p.chartMaxKg * 2.2046226218).toFixed(1)).toBe("165.0");
  });

  it("computes signed change from earliest to latest point", () => {
    const p = buildWeightBaselineCardPresentation({
      model: readyModel,
      points: [
        { observedAt: "2026-01-01T00:00:00.000Z", weightKg: 72 },
        { observedAt: "2026-03-01T00:00:00.000Z", weightKg: 72.45 },
      ],
      unit: "lb",
    });
    expect(p.changeLabel).toBe("+1.0 lb");
    expect(p.rangeDeltaHeadlineValueLabel).toBe("2.6 lb");
  });

  it("builds evenly spaced x-axis labels with start and end anchors", () => {
    const p = buildWeightBaselineCardPresentation({
      model: readyModel,
      points: [
        { observedAt: "2026-01-01T00:00:00.000Z", weightKg: 72 },
        { observedAt: "2026-03-01T00:00:00.000Z", weightKg: 72.45 },
      ],
      unit: "lb",
    });
    expect(p.xAxisLabels.length).toBe(5);
    expect(p.xAxisLabels[0]!.anchor).toBe("start");
    expect(p.xAxisLabels[p.xAxisLabels.length - 1]!.anchor).toBe("end");
  });
});

