/**
 * Cross-surface parity: Weight card display ticks and Weight trend chart bands
 * share the same BMI→kg cutoffs from the approved CDC/WHO resolver.
 */
import {
  buildWeightTrendClassificationBands,
  clipWeightTrendBandToDomain,
} from "@/lib/body/presentation/buildWeightTrendClassificationBands";
import { resolveWeightBmiScreeningPresentation } from "@/lib/body/standards/resolveBodyMetricStandardPresentation";
import {
  buildCdcWhoHeightWeightDisplayTicks,
} from "@/lib/body/standards/cdcWhoHeightWeightRangeDisplay";
import {
  weightKgForBmiAtHeight,
} from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import {
  BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS,
  resolveBodyMetricClassificationBandChrome,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";

const HEIGHT_CM = 170;
const AGE = 34;

describe("Weight card ↔ trend chart classification parity", () => {
  it("shares exact BMI→kg boundaries with Weight-card tick source", () => {
    const bands = buildWeightTrendClassificationBands({
      heightCm: HEIGHT_CM,
      ageYears: AGE,
    });
    expect(bands.status).toBe("ready");
    if (bands.status !== "ready") return;

    const kg185 = weightKgForBmiAtHeight(18.5, HEIGHT_CM)!;
    const kg25 = weightKgForBmiAtHeight(25, HEIGHT_CM)!;
    const kg30 = weightKgForBmiAtHeight(30, HEIGHT_CM)!;

    expect(bands.boundariesKg[0]).toBeCloseTo(kg185, 8);
    expect(bands.boundariesKg[1]).toBeCloseTo(kg25, 8);
    expect(bands.boundariesKg[2]).toBeCloseTo(kg30, 8);

    const ticks = buildCdcWhoHeightWeightDisplayTicks(HEIGHT_CM, "lb");
    expect(ticks).not.toBeNull();
    // Card labels round the same underlying kg boundaries — not a second cutoff source.
    expect(ticks!.atBmi185).toBe(Math.round(kg185 * 2.2046226218));
    expect(ticks!.atBmi25).toBe(Math.round(kg25 * 2.2046226218));
    expect(ticks!.atBmi30).toBe(Math.round(kg30 * 2.2046226218));
  });

  it("maps the same class IDs and tones as the Weight-card presentation", () => {
    const bands = buildWeightTrendClassificationBands({
      heightCm: HEIGHT_CM,
      ageYears: AGE,
    });
    if (bands.status !== "ready") throw new Error("expected ready");

    const presentation = resolveWeightBmiScreeningPresentation({
      metric: "weight",
      weightKg: 74,
      bodyFatPercent: null,
      leanBodyMassKg: null,
      bmi: null,
      heightCm: HEIGHT_CM,
      ageYears: AGE,
      sex: "male",
      measurementMethod: null,
      massDisplayUnit: "lb",
    });
    expect(presentation).not.toBeNull();
    expect(presentation!.segments.map((s) => s.id)).toEqual(bands.bands.map((b) => b.id));
    expect(presentation!.segments.map((s) => s.tone)).toEqual(bands.bands.map((b) => b.tone));
    for (const band of bands.bands) {
      expect(resolveBodyMetricClassificationBandChrome(band.tone).fillStrong).toBe(
        BODY_METRIC_CLASSIFICATION_FILL_STRONG_TOKENS[band.tone],
      );
    }
  });

  it("clips bands to visible domain without inventing offscreen categories", () => {
    const bands = buildWeightTrendClassificationBands({
      heightCm: HEIGHT_CM,
      ageYears: AGE,
    });
    if (bands.status !== "ready") throw new Error("expected ready");

    const healthy = bands.bands.find((b) => b.id === "healthy_weight")!;
    const overweight = bands.bands.find((b) => b.id === "overweight")!;
    // Domain that only intersects healthy + overweight near the BMI-25 boundary.
    const mid = bands.boundariesKg[1];
    const domainMin = mid - 2;
    const domainMax = mid + 2;

    const visible = bands.bands
      .map((band) =>
        clipWeightTrendBandToDomain({
          band,
          displayMinKg: domainMin,
          displayMaxKg: domainMax,
          softMinKg: bands.softExtentKg[0],
          softMaxKg: bands.softExtentKg[1],
        })
          ? band.id
          : null,
      )
      .filter((id): id is NonNullable<typeof id> => id != null);

    expect(visible).toContain(healthy.id);
    expect(visible).toContain(overweight.id);
    expect(visible).not.toContain("underweight");
    expect(visible).not.toContain("obesity");
  });
});
