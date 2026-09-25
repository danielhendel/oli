import {
  buildWeightTrendMonthMarkers,
  placeWeightTrendMonthMarkersOnDomain,
  resolveWeightTrendMonthMarkersForRange,
  WEIGHT_TREND_MONTH_LABEL_RANGES,
} from "@/lib/body/presentation/buildWeightTrendMonthMarkers";
import { mapWeightTrendTimeToX } from "@/lib/body/presentation/weightTrendTimeScale";

describe("buildWeightTrendMonthMarkers", () => {
  it("anchors letters at month starts on the shared time scale", () => {
    const minTimeMs = Date.UTC(2025, 8, 27, 12, 0, 0); // Sep 27
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0); // Sep 21
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });

    expect(markers.length).toBeGreaterThanOrEqual(12);
    expect(markers[0]!.letter).toBe("S");
    expect(markers[0]!.timeMs).toBe(minTimeMs); // partial Sep clamped to domain start

    const dec = markers.find((m) => m.key === "2025-12");
    expect(dec).toBeDefined();
    expect(dec!.timeMs).toBe(Date.UTC(2025, 11, 1, 12, 0, 0)); // Dec 1, not mid-month
  });

  it("places Dec 2 under December interval, not November", () => {
    const minTimeMs = Date.UTC(2025, 9, 1, 12, 0, 0); // Oct 1
    const maxTimeMs = Date.UTC(2026, 0, 31, 12, 0, 0); // Jan 31
    const scale = {
      domainStartMs: minTimeMs,
      domainEndMs: maxTimeMs,
      plotLeft: 40,
      plotWidth: 300,
    };
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });
    const placed = placeWeightTrendMonthMarkersOnDomain({ markers, scale });

    const nov = placed.find((m) => m.key === "2025-11")!;
    const dec = placed.find((m) => m.key === "2025-12")!;
    const jan = placed.find((m) => m.key === "2026-01")!;
    const dec2X = mapWeightTrendTimeToX(Date.UTC(2025, 11, 2, 12, 0, 0), scale);

    expect(dec2X).toBeGreaterThan(nov.x);
    expect(dec2X).toBeGreaterThanOrEqual(dec.x);
    expect(dec2X).toBeLessThan(jan.x);
  });

  it("shows month labels for ≤1Y and omits for 3Y / 5Y / All", () => {
    const scale = {
      domainStartMs: Date.UTC(2025, 0, 1, 12, 0, 0),
      domainEndMs: Date.UTC(2025, 11, 31, 12, 0, 0),
      plotLeft: 40,
      plotWidth: 280,
    };

    for (const range of ["7D", "30D", "90D", "6M", "1Y"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(true);
      expect(resolveWeightTrendMonthMarkersForRange({ range, scale }).length).toBeGreaterThan(0);
    }
    for (const range of ["3Y", "5Y", "All"] as const) {
      expect(WEIGHT_TREND_MONTH_LABEL_RANGES.has(range)).toBe(false);
      expect(resolveWeightTrendMonthMarkersForRange({ range, scale })).toEqual([]);
    }
  });
});
