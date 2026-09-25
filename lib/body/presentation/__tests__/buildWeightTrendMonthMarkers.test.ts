import {
  buildWeightTrendMonthMarkers,
  placeWeightTrendMonthMarkersEvenly,
  resolveWeightTrendMonthMarkersForRange,
  WEIGHT_TREND_MONTH_LABEL_RANGES,
} from "@/lib/body/presentation/buildWeightTrendMonthMarkers";

describe("buildWeightTrendMonthMarkers", () => {
  it("returns single-letter months intersecting the plotted time domain", () => {
    const minTimeMs = Date.UTC(2025, 8, 27, 12, 0, 0);
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0);
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });

    expect(markers.length).toBeGreaterThanOrEqual(12);
    expect(markers[0]!.letter).toBe("S");
    expect(markers[markers.length - 1]!.letter).toBe("S");
    expect(markers.every((m) => m.letter.length === 1)).toBe(true);
  });

  it("places month letters with even spacing across the plot", () => {
    const minTimeMs = Date.UTC(2025, 8, 27, 12, 0, 0);
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0);
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });
    const placed = placeWeightTrendMonthMarkersEvenly({
      markers,
      plotLeft: 40,
      plotWidth: 300,
    });

    expect(placed.length).toBe(markers.length);
    const gaps: number[] = [];
    for (let i = 1; i < placed.length; i++) {
      gaps.push(placed[i]!.x - placed[i - 1]!.x);
    }
    const expectedGap = 300 / markers.length;
    for (const gap of gaps) {
      expect(gap).toBeCloseTo(expectedGap, 5);
    }
    expect(placed[0]!.x).toBeCloseTo(40 + expectedGap / 2, 5);
    expect(placed[placed.length - 1]!.x).toBeCloseTo(40 + 300 - expectedGap / 2, 5);
  });

  it("shows month labels for 1Y and less, omits for 3Y / 5Y / All", () => {
    const domain = {
      minTimeMs: Date.UTC(2025, 0, 1, 12, 0, 0),
      maxTimeMs: Date.UTC(2025, 11, 31, 12, 0, 0),
      plotLeft: 40,
      plotWidth: 280,
    };

    for (const range of ["7D", "30D", "90D", "6M", "1Y"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(true);
      expect(
        resolveWeightTrendMonthMarkersForRange({ range, ...domain }).length,
      ).toBeGreaterThan(0);
    }

    for (const range of ["3Y", "5Y", "All"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(false);
      expect(resolveWeightTrendMonthMarkersForRange({ range, ...domain })).toEqual([]);
    }
  });
});
