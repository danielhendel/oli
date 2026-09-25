import {
  buildWeightTrendMonthBuckets,
  mapWeightTrendTimeToMonthBucketX,
  placeWeightTrendMonthBucketLabels,
  usesWeightTrendMonthBucketScale,
  weightTrendMonthBucketBounds,
} from "@/lib/body/presentation/weightTrendMonthBucketScale";

describe("weightTrendMonthBucketScale", () => {
  it("places equal-width bucket centers for Mar→Sep coverage", () => {
    const minTimeMs = Date.UTC(2026, 2, 27, 12, 0, 0); // Mar 27
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0); // Sep 21
    const buckets = buildWeightTrendMonthBuckets({ minTimeMs, maxTimeMs });
    expect(buckets.map((b) => b.letter)).toEqual(["M", "A", "M", "J", "J", "A", "S"]);

    const scale = { buckets, plotLeft: 40, plotWidth: 280 };
    const labels = placeWeightTrendMonthBucketLabels({ scale });
    expect(labels.map((l) => l.letter)).toEqual(["M", "A", "M", "J", "J", "A", "S"]);

    const gaps: number[] = [];
    for (let i = 1; i < labels.length; i++) {
      gaps.push(labels[i]!.x - labels[i - 1]!.x);
    }
    const expectedGap = 280 / 7;
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(expectedGap, 5);
    }
  });

  it("positions June days within the same equal-width June bucket", () => {
    const minTimeMs = Date.UTC(2026, 5, 1, 0, 0, 0);
    const maxTimeMs = Date.UTC(2026, 5, 30, 23, 0, 0);
    const buckets = buildWeightTrendMonthBuckets({ minTimeMs, maxTimeMs });
    const scale = { buckets, plotLeft: 0, plotWidth: 100 };
    const june = buckets.find((b) => b.key === "2026-06")!;
    const bounds = weightTrendMonthBucketBounds(june.bucketIndex, scale);

    const jun1 = mapWeightTrendTimeToMonthBucketX(Date.UTC(2026, 5, 1, 12, 0, 0), scale);
    const jun15 = mapWeightTrendTimeToMonthBucketX(Date.UTC(2026, 5, 15, 12, 0, 0), scale);
    const jun30 = mapWeightTrendTimeToMonthBucketX(Date.UTC(2026, 5, 30, 12, 0, 0), scale);

    expect(jun1).toBeGreaterThanOrEqual(bounds.left);
    expect(jun1).toBeLessThan(bounds.left + (bounds.right - bounds.left) * 0.1);
    expect(jun15).toBeGreaterThan(bounds.left + (bounds.right - bounds.left) * 0.4);
    expect(jun15).toBeLessThan(bounds.left + (bounds.right - bounds.left) * 0.6);
    expect(jun30).toBeGreaterThan(bounds.left + (bounds.right - bounds.left) * 0.9);
    expect(jun30).toBeLessThanOrEqual(bounds.right);
  });

  it("aligns Dec 2 inside December bucket with D label center", () => {
    const minTimeMs = Date.UTC(2025, 9, 1, 12, 0, 0); // Oct
    const maxTimeMs = Date.UTC(2026, 0, 31, 12, 0, 0); // Jan
    const buckets = buildWeightTrendMonthBuckets({ minTimeMs, maxTimeMs });
    const scale = { buckets, plotLeft: 40, plotWidth: 300 };
    const labels = placeWeightTrendMonthBucketLabels({ scale });

    const dec = buckets.find((b) => b.key === "2025-12")!;
    const decLabel = labels.find((l) => l.key === "2025-12")!;
    const bounds = weightTrendMonthBucketBounds(dec.bucketIndex, scale);
    const dec2X = mapWeightTrendTimeToMonthBucketX(
      Date.UTC(2025, 11, 2, 12, 0, 0),
      scale,
    );

    expect(dec2X).toBeGreaterThanOrEqual(bounds.left);
    expect(dec2X).toBeLessThan(bounds.right);
    expect(decLabel.x).toBeCloseTo(bounds.center, 5);
    // Guide must equal point X when using the same mapper.
    expect(dec2X).toBe(mapWeightTrendTimeToMonthBucketX(Date.UTC(2025, 11, 2, 12, 0, 0), scale));
  });

  it("enables month buckets for 90D / 6M / 1Y and disables for 7D / 30D / 3Y / 5Y / All", () => {
    for (const range of ["90D", "6M", "1Y"] as const) {
      expect(usesWeightTrendMonthBucketScale(range)).toBe(true);
    }
    for (const range of ["7D", "30D", "3Y", "5Y", "All"] as const) {
      expect(usesWeightTrendMonthBucketScale(range)).toBe(false);
    }
  });
});
