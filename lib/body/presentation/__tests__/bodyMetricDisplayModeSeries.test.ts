import { bmiFromWeightAndHeight } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import { buildHistoricalBmiSeries } from "@/lib/body/presentation/buildHistoricalBmiSeries";
import { buildHistoricalFatMassSeries } from "@/lib/body/presentation/buildHistoricalFatMassSeries";
import { buildHistoricalLeanPercentSeries } from "@/lib/body/presentation/buildHistoricalLeanPercentSeries";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

function pt(dayKey: string, value: number, sourceId = "apple_health"): WeightPoint {
  return {
    observedAt: `${dayKey}T12:00:00.000Z`,
    dayKey,
    weightKg: value,
    sourceId,
  };
}

describe("buildHistoricalBmiSeries", () => {
  it("derives BMI from Weight and profile height", () => {
    // 68 in = 172.72 cm; 164.6 lb ≈ 74.662 kg
    const heightCm = 68 * 2.54;
    const weightKg = 164.6 / 2.2046226218;
    const expected = bmiFromWeightAndHeight(weightKg, heightCm);
    expect(expected).not.toBeNull();
    const series = buildHistoricalBmiSeries({
      weightPoints: [pt("2026-09-21", weightKg)],
      heightCm,
    });
    expect(series).toHaveLength(1);
    expect(series[0]!.weightKg).toBeCloseTo(expected!, 4);
  });

  it("fails closed when height is missing", () => {
    expect(
      buildHistoricalBmiSeries({
        weightPoints: [pt("2026-09-21", 74)],
        heightCm: null,
      }),
    ).toEqual([]);
  });
});

describe("buildHistoricalFatMassSeries", () => {
  it("derives fat mass from compatible same-day Weight", () => {
    const weightKg = 164.6 / 2.2046226218;
    const bfPct = 17.7;
    const series = buildHistoricalFatMassSeries({
      bodyFatPoints: [pt("2026-09-21", bfPct)],
      weightPoints: [pt("2026-09-21", weightKg)],
    });
    expect(series).toHaveLength(1);
    expect(series[0]!.weightKg).toBeCloseTo(weightKg * (bfPct / 100), 4);
    // ≈ 29.1 lb
    expect(series[0]!.weightKg * 2.2046226218).toBeCloseTo(29.14, 1);
  });

  it("omits Body Fat days without compatible Weight", () => {
    const series = buildHistoricalFatMassSeries({
      bodyFatPoints: [pt("2026-09-21", 17.7)],
      weightPoints: [pt("2026-09-01", 74)],
    });
    expect(series).toEqual([]);
  });

  it("does not substitute current Weight for a different day", () => {
    const series = buildHistoricalFatMassSeries({
      bodyFatPoints: [pt("2026-07-28", 18.2)],
      weightPoints: [pt("2026-09-21", 74)],
    });
    expect(series).toEqual([]);
  });
});

describe("buildHistoricalLeanPercentSeries", () => {
  it("derives Lean % from Lean Mass / compatible Weight (not 100−BF)", () => {
    const weightKg = 164.6 / 2.2046226218;
    const leanKg = 135.4 / 2.2046226218;
    const series = buildHistoricalLeanPercentSeries({
      leanMassPoints: [pt("2026-09-21", leanKg)],
      weightPoints: [pt("2026-09-21", weightKg)],
    });
    expect(series).toHaveLength(1);
    expect(series[0]!.weightKg).toBeCloseTo((leanKg / weightKg) * 100, 3);
    expect(series[0]!.weightKg).toBeCloseTo(82.3, 1);
  });

  it("withholds when Weight is incompatible", () => {
    expect(
      buildHistoricalLeanPercentSeries({
        leanMassPoints: [pt("2026-09-21", 60)],
        weightPoints: [],
      }),
    ).toEqual([]);
  });
});
