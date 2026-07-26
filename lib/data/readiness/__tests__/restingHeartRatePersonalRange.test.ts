import { describe, expect, it } from "@jest/globals";

import {
  buildRestingHeartRatePersonalRangeBounds,
  classifyRestingHeartRateAgainstUsualRange,
  medianSorted,
  percentileLinearSorted,
  RESTING_HEART_RATE_PERSONAL_RANGE_MIN_VALID_NIGHTS,
  RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_VERSION,
  restingHeartRatePatternStatusLabel,
  restingHeartRatePersonalRangeMarkerPosition01,
  restingHeartRatePersonalRangeZoneCopy,
  restingHeartRatePersonalRangeZoneFractions,
  restingHeartRateVisualDomain,
} from "@/lib/data/readiness/restingHeartRatePersonalRange";

function samplesAround(center: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    // Deterministic spread ±3 around center
    out.push(center + ((i % 7) - 3));
  }
  return out;
}

describe("restingHeartRatePersonalRange", () => {
  it("requires at least 30 valid nights", () => {
    expect(RESTING_HEART_RATE_PERSONAL_RANGE_MIN_VALID_NIGHTS).toBe(30);
    expect(buildRestingHeartRatePersonalRangeBounds(samplesAround(50, 29))).toBeNull();
    expect(buildRestingHeartRatePersonalRangeBounds(samplesAround(50, 30))).not.toBeNull();
  });

  it("builds IQR bounds and classifies inclusive edges", () => {
    const bounds = buildRestingHeartRatePersonalRangeBounds(samplesAround(50, 40));
    expect(bounds).not.toBeNull();
    expect(bounds!.modelVersion).toBe(RESTING_HEART_RATE_PERSONAL_RANGE_MODEL_VERSION);
    expect(bounds!.lowerBoundBpm).toBeLessThanOrEqual(bounds!.upperBoundBpm);

    const atLower = classifyRestingHeartRateAgainstUsualRange({
      bpm: bounds!.lowerBoundBpm,
      bounds: bounds!,
    });
    const atUpper = classifyRestingHeartRateAgainstUsualRange({
      bpm: bounds!.upperBoundBpm,
      bounds: bounds!,
    });
    expect(atLower?.status).toBe("in_usual");
    expect(atUpper?.status).toBe("in_usual");
    expect(atLower?.label).toBe("In your usual range");

    const below = classifyRestingHeartRateAgainstUsualRange({
      bpm: bounds!.lowerBoundBpm - 0.01,
      bounds: bounds!,
    });
    const above = classifyRestingHeartRateAgainstUsualRange({
      bpm: bounds!.upperBoundBpm + 0.01,
      bounds: bounds!,
    });
    expect(below?.status).toBe("below_usual");
    expect(above?.status).toBe("above_usual");
    expect(below?.label).toBe("Below your usual range");
    expect(above?.label).toBe("Above your usual range");
    expect(restingHeartRatePatternStatusLabel("in_usual")).toBe("In usual range");
  });

  it("withholds classification for missing current and rejects population ladders", () => {
    const bounds = buildRestingHeartRatePersonalRangeBounds(samplesAround(52, 30))!;
    expect(classifyRestingHeartRateAgainstUsualRange({ bpm: null, bounds })).toBeNull();
    expect(classifyRestingHeartRateAgainstUsualRange({ bpm: Number.NaN, bounds })).toBeNull();
    const result = classifyRestingHeartRateAgainstUsualRange({ bpm: 52, bounds })!;
    expect(result.label).not.toMatch(/Optimal|Good|Fair|Healthy|Elite|Poor|Recommended/);
  });

  it("handles identical values, outliers, and even/odd counts deterministically", () => {
    const identical = Array.from({ length: 30 }, () => 50);
    const identicalBounds = buildRestingHeartRatePersonalRangeBounds(identical)!;
    expect(identicalBounds.lowerBoundBpm).toBe(49);
    expect(identicalBounds.upperBoundBpm).toBe(51);
    expect(identicalBounds.medianBpm).toBe(50);

    const withOutliers = [...samplesAround(50, 30), 220, 30];
    const outlierBounds = buildRestingHeartRatePersonalRangeBounds(withOutliers)!;
    expect(outlierBounds.lowerBoundBpm).toBeGreaterThan(30);
    expect(outlierBounds.upperBoundBpm).toBeLessThan(220);

    const odd = [1, 2, 3, 4, 5];
    expect(medianSorted(odd)).toBe(3);
    const even = [1, 2, 3, 4];
    expect(medianSorted(even)).toBe(2.5);
    expect(percentileLinearSorted(even, 0.25)).toBeCloseTo(1.75, 10);
    expect(percentileLinearSorted(even, 0.75)).toBeCloseTo(3.25, 10);

    expect(buildRestingHeartRatePersonalRangeBounds([1, Number.NaN, 2])).toBeNull();
  });

  it("visual domain pads around usual range and clamps marker only", () => {
    const bounds = buildRestingHeartRatePersonalRangeBounds(samplesAround(50, 30))!;
    const domain = restingHeartRateVisualDomain(bounds);
    expect(domain.visualMinBpm).toBeLessThan(bounds.lowerBoundBpm);
    expect(domain.visualMaxBpm).toBeGreaterThan(bounds.upperBoundBpm);

    const zones = restingHeartRatePersonalRangeZoneFractions(bounds);
    expect(zones.below + zones.usual + zones.above).toBeCloseTo(1, 8);
    expect(zones.usual).toBeGreaterThan(0);

    const copy = restingHeartRatePersonalRangeZoneCopy(bounds);
    expect(copy.belowLabel).toBe("Below Usual");
    expect(copy.usualLabel).toBe("Your Usual");
    expect(copy.aboveLabel).toBe("Above Usual");
    expect(copy.usualRangeText).toMatch(/bpm/);

    expect(restingHeartRatePersonalRangeMarkerPosition01({ bpm: -100, bounds })).toBe(0.02);
    expect(restingHeartRatePersonalRangeMarkerPosition01({ bpm: 999, bounds })).toBe(0.98);
    // Classification still uses actual extreme value
    expect(
      classifyRestingHeartRateAgainstUsualRange({ bpm: 999, bounds })?.status,
    ).toBe("above_usual");
  });
});
