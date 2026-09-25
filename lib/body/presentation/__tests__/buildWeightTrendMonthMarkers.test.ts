import {
  buildWeightTrendMonthMarkers,
  placeWeightTrendMonthMarkersOnDomain,
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

  it("places month letters on the same time scale as the series", () => {
    const minTimeMs = Date.UTC(2025, 8, 27, 12, 0, 0);
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0);
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });
    const plotLeft = 40;
    const plotWidth = 300;
    const toChartX = (t: number) =>
      plotLeft + ((t - minTimeMs) / (maxTimeMs - minTimeMs)) * plotWidth;

    const placed = placeWeightTrendMonthMarkersOnDomain({ markers, toChartX });
    expect(placed.length).toBe(markers.length);

    // Dec mid vs Nov mid must map to later X (domain-aligned, not evenly faked).
    const nov = placed.find((m) => m.key === "2025-11");
    const dec = placed.find((m) => m.key === "2025-12");
    expect(nov).toBeDefined();
    expect(dec).toBeDefined();
    expect(dec!.x).toBeGreaterThan(nov!.x);
    expect(dec!.x).toBeCloseTo(toChartX(dec!.timeMs), 5);
  });

  it("shows month labels for 1Y and less, omits for 3Y / 5Y / All", () => {
    const minTimeMs = Date.UTC(2025, 0, 1, 12, 0, 0);
    const maxTimeMs = Date.UTC(2025, 11, 31, 12, 0, 0);
    const toChartX = (t: number) => ((t - minTimeMs) / (maxTimeMs - minTimeMs)) * 280;

    for (const range of ["7D", "30D", "90D", "6M", "1Y"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(true);
      expect(
        resolveWeightTrendMonthMarkersForRange({
          range,
          minTimeMs,
          maxTimeMs,
          toChartX,
        }).length,
      ).toBeGreaterThan(0);
    }

    for (const range of ["3Y", "5Y", "All"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(false);
      expect(
        resolveWeightTrendMonthMarkersForRange({
          range,
          minTimeMs,
          maxTimeMs,
          toChartX,
        }),
      ).toEqual([]);
    }
  });
});
