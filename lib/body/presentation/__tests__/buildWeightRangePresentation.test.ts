import { buildWeightRangePresentation } from "@/lib/body/presentation/buildWeightRangePresentation";
import {
  resolveWeightRangeCoverage,
  selectWeightBaselineAtOrBeforeStart,
} from "@/lib/body/presentation/resolveWeightRangeCoverage";
import { selectWeightSeriesForRange } from "@/lib/body/presentation/selectWeightSeriesForRange";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

function pt(day: string, kg: number, at = `${day}T12:00:00.000Z`): WeightPoint {
  return {
    dayKey: day,
    observedAt: at,
    weightKg: kg,
    sourceId: "manual",
  };
}

const ANCHOR = "2026-09-21";

describe("selectWeightSeriesForRange", () => {
  it("excludes points before the requested 1Y start from the plotted series", () => {
    const series = selectWeightSeriesForRange(
      [pt("2025-08-10", 70), pt("2025-09-21", 73), pt("2026-09-21", 74)],
      "1Y",
      { anchorDayKey: ANCHOR },
    );
    expect(series.requestedStart).toBe("2025-09-21");
    expect(series.plottedPoints.map((p) => p.dayKey)).toEqual(["2025-09-21", "2026-09-21"]);
  });

  it("All keeps every valid observation", () => {
    const series = selectWeightSeriesForRange(
      [pt("2025-08-10", 70), pt("2026-09-21", 74)],
      "All",
      { anchorDayKey: ANCHOR },
    );
    expect(series.requestedStart).toBeNull();
    expect(series.plottedPoints).toHaveLength(2);
  });
});

describe("resolveWeightRangeCoverage — first-to-last plotted", () => {
  it("0 points → partial / Change unavailable", () => {
    const coverage = resolveWeightRangeCoverage({
      selectedRange: "1Y",
      requestedStart: "2025-09-21",
      requestedEnd: ANCHOR,
      plottedPoints: [],
      allValidPoints: [],
    });
    expect(coverage.status).toBe("partial");
  });

  it("1 point → partial / Change unavailable", () => {
    const one = [pt("2026-09-21", 74)];
    const coverage = resolveWeightRangeCoverage({
      selectedRange: "1Y",
      requestedStart: "2025-09-21",
      requestedEnd: ANCHOR,
      plottedPoints: one,
      allValidPoints: one,
    });
    expect(coverage.status).toBe("partial");
  });

  it("2 points → Change = second − first", () => {
    const plotted = [pt("2026-01-01", 73), pt("2026-09-21", 74.3)];
    const coverage = resolveWeightRangeCoverage({
      selectedRange: "1Y",
      requestedStart: "2025-09-21",
      requestedEnd: ANCHOR,
      plottedPoints: plotted,
      allValidPoints: plotted,
    });
    expect(coverage.status).toBe("complete");
    if (coverage.status === "complete") {
      expect(coverage.deltaKg).toBeCloseTo(1.3, 5);
      expect(coverage.baselinePoint.dayKey).toBe("2026-01-01");
      expect(coverage.latestPoint.dayKey).toBe("2026-09-21");
    }
  });

  it("partial theoretical 1Y window still exposes Change when ≥2 plotted points", () => {
    const plotted = [pt("2026-01-01", 70), pt("2026-06-01", 72), pt("2026-09-21", 74)];
    const coverage = resolveWeightRangeCoverage({
      selectedRange: "1Y",
      requestedStart: "2025-09-21",
      requestedEnd: ANCHOR,
      plottedPoints: plotted,
      allValidPoints: plotted,
    });
    expect(coverage.status).toBe("complete");
    if (coverage.status === "complete") {
      expect(coverage.deltaKg).toBe(4);
    }
  });

  it("All uses earliest-to-latest plotted", () => {
    const all = [pt("2025-08-10", 70), pt("2026-09-21", 74)];
    const coverage = resolveWeightRangeCoverage({
      selectedRange: "All",
      requestedStart: null,
      requestedEnd: ANCHOR,
      plottedPoints: all,
      allValidPoints: all,
    });
    expect(coverage.status).toBe("complete");
    if (coverage.status === "complete") {
      expect(coverage.deltaKg).toBe(4);
    }
  });
});

describe("selectWeightBaselineAtOrBeforeStart", () => {
  it("picks the latest observation on or before the requested start", () => {
    const baseline = selectWeightBaselineAtOrBeforeStart(
      [pt("2025-09-10", 72), pt("2025-09-21", 73), pt("2025-09-22", 74)],
      "2025-09-21",
    );
    expect(baseline?.dayKey).toBe("2025-09-21");
    expect(baseline?.weightKg).toBe(73);
  });
});

describe("buildWeightRangePresentation — same series truth", () => {
  it("chart / Change / High / Low share one plotted series; Change is first→last", () => {
    const points = [
      pt("2025-08-10", 70),
      pt("2025-09-21", 73),
      pt("2026-03-01", 75),
      pt("2026-09-21", 74.3),
    ];
    const presentation = buildWeightRangePresentation({
      selectedRange: "1Y",
      points,
      anchorDayKey: ANCHOR,
    });
    expect(presentation.plottedPointIds).toEqual(
      presentation.plottedPoints.map((p) => p.observedAt),
    );
    expect(presentation.plottedPoints.map((p) => p.dayKey)).not.toContain("2025-08-10");
    expect(presentation.highKg).toBe(75);
    expect(presentation.lowKg).toBe(73);
    // First plotted 73 → last 74.3
    expect(presentation.changeKg).toBeCloseTo(1.3, 5);
    expect(presentation.observedExtent?.firstDayKey).toBe("2025-09-21");
    expect(presentation.observedExtent?.lastDayKey).toBe("2026-09-21");
  });

  it("partial selected duration still shows Change from plotted endpoints", () => {
    const presentation = buildWeightRangePresentation({
      selectedRange: "1Y",
      points: [pt("2026-04-01", 73), pt("2026-09-21", 74)],
      anchorDayKey: ANCHOR,
    });
    expect(presentation.changeKg).toBe(1);
    expect(presentation.coverage.status).toBe("complete");
    expect(presentation.observedExtent?.firstDayKey).toBe("2026-04-01");
    expect(presentation.observedExtent?.lastDayKey).toBe("2026-09-21");
  });
});
