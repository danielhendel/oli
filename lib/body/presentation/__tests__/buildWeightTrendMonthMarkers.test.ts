import {
  buildWeightTrendMonthMarkers,
  resolveWeightTrendMonthMarkersForRange,
  WEIGHT_TREND_MONTH_LABEL_RANGES,
} from "@/lib/body/presentation/buildWeightTrendMonthMarkers";

/**
 * Legacy month-start marker helpers — chart ≤1Y presentation now uses
 * {@link buildWeightTrendXAxisTicks} on the shared pinned X-scale.
 */
describe("buildWeightTrendMonthMarkers (calendar month list)", () => {
  it("lists calendar months intersecting the domain", () => {
    const minTimeMs = Date.UTC(2025, 8, 27, 12, 0, 0); // Sep 27
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0); // Sep 21
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });

    expect(markers.length).toBeGreaterThanOrEqual(12);
    expect(markers[0]!.letter).toBe("S");
    expect(markers.map((m) => m.letter).join("")).toContain("SONDJFMAMJJAS");
  });

  it("month-bucket ranges are 90D / 6M / 1Y / YTD; long ranges omit months", () => {
    for (const range of ["90D", "6M", "1Y", "YTD"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(true);
    }
    for (const range of ["7D", "30D", "3Y", "5Y", "All"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(false);
      expect(
        resolveWeightTrendMonthMarkersForRange({
          range,
          scale: {
            domainStartMs: Date.UTC(2025, 0, 1),
            domainEndMs: Date.UTC(2025, 11, 31),
            plotLeft: 40,
            plotWidth: 280,
          },
        }),
      ).toEqual([]);
    }
  });
});
