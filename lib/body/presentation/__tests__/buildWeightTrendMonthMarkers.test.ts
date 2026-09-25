import {
  buildWeightTrendMonthMarkers,
  thinWeightTrendMonthMarkersForPlot,
} from "@/lib/body/presentation/buildWeightTrendMonthMarkers";

describe("buildWeightTrendMonthMarkers", () => {
  it("returns single-letter months intersecting the plotted time domain", () => {
    // ~ Sep 27 2025 – Sep 21 2026 (UTC midpoints)
    const minTimeMs = Date.UTC(2025, 8, 27, 12, 0, 0);
    const maxTimeMs = Date.UTC(2026, 8, 21, 12, 0, 0);
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });

    expect(markers.length).toBeGreaterThanOrEqual(12);
    expect(markers[0]!.letter).toBe("S"); // Sep 2025
    expect(markers[markers.length - 1]!.letter).toBe("S"); // Sep 2026
    expect(markers.every((m) => m.letter.length === 1)).toBe(true);
    expect(markers.every((m) => m.timeMs >= minTimeMs && m.timeMs <= maxTimeMs)).toBe(
      true,
    );
  });

  it("returns only months inside a short window", () => {
    const minTimeMs = Date.UTC(2026, 2, 10, 12, 0, 0); // Mar 10
    const maxTimeMs = Date.UTC(2026, 2, 17, 12, 0, 0); // Mar 17
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });
    expect(markers).toHaveLength(1);
    expect(markers[0]!.letter).toBe("M");
    expect(markers[0]!.key).toBe("2026-03");
  });

  it("thins crowded markers without inventing months", () => {
    const minTimeMs = Date.UTC(2025, 0, 1, 12, 0, 0);
    const maxTimeMs = Date.UTC(2025, 11, 31, 12, 0, 0);
    const markers = buildWeightTrendMonthMarkers({ minTimeMs, maxTimeMs });
    // Squeeze entire year into 60px → many letters collide.
    const toChartX = (t: number) => ((t - minTimeMs) / (maxTimeMs - minTimeMs)) * 60;
    const thinned = thinWeightTrendMonthMarkersForPlot({
      markers,
      toChartX,
      minGapPx: 14,
    });
    expect(thinned.length).toBeLessThan(markers.length);
    expect(thinned.length).toBeGreaterThanOrEqual(1);
    expect(thinned[0]!.key).toBe(markers[0]!.key);
  });
});
