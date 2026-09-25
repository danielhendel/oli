import {
  buildBodyMetricTrendAccessibilitySummary,
  buildBodyMetricTrendDetailModel,
} from "@/lib/body/presentation/buildBodyMetricTrendDetailModel";
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

describe("buildBodyMetricTrendDetailModel", () => {
  it("maps partial and error honestly", () => {
    expect(
      buildBodyMetricTrendDetailModel({
        range: "1Y",
        points: [],
        stats: { change: null, avg: null, high: null, low: null },
        trendsStatus: "partial",
        anchorDayKey: ANCHOR,
      }).status,
    ).toBe("partial");

    const err = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points: [],
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "error",
      errorMessage: "network",
      anchorDayKey: ANCHOR,
    });
    expect(err.status).toBe("error");
    expect(err.errorMessage).toMatch(/network|Couldn’t|Try again/i);
  });

  it("missing when no valid points", () => {
    const model = buildBodyMetricTrendDetailModel({
      range: "30D",
      points: [pt("2026-09-01", 0), pt("2026-09-02", Number.NaN)],
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.status).toBe("missing");
    expect(model.latest).toBeNull();
  });

  it("one point is insufficient — latest/high/low valid, change null", () => {
    const model = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points: [pt("2026-09-16", 74.3)],
      stats: { change: null, avg: 74.3, high: 74.3, low: 74.3 },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.status).toBe("insufficient");
    expect(model.latest?.valueKg).toBe(74.3);
    expect(model.change).toBeNull();
    expect(model.average).toBe(74.3);
    expect(model.high).toBe(74.3);
    expect(model.low).toBe(74.3);
  });

  it("1Y Change is last plotted − first plotted (even with complete baseline)", () => {
    const points = [
      pt("2025-09-21", 73),
      pt("2026-01-10", 75.5),
      pt("2026-09-21", 74.3),
    ];
    const model = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points,
      stats: { change: 99, avg: 99, high: 99, low: 99 },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.status).toBe("ready");
    expect(model.latest?.dayKey).toBe("2026-09-21");
    expect(model.change).toBeCloseTo(1.3, 5);
    expect(model.high).toBe(75.5);
    expect(model.low).toBe(73);
    expect(model.changeUnavailableDueToPartialCoverage).toBe(false);
    expect(model.sameDayPolicy).toBe("all_observations_by_observedAt");
  });

  it("partial theoretical 1Y still exposes Change from plotted endpoints", () => {
    const points = [
      pt("2026-01-01", 73),
      pt("2026-06-01", 75),
      pt("2026-09-21", 74.3),
    ];
    const model = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points,
      stats: { change: 1.3, avg: 74, high: 75, low: 73 },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.change).toBeCloseTo(1.3, 5);
    expect(model.changeUnavailableDueToPartialCoverage).toBe(false);
    expect(model.high).toBe(75);
    expect(model.low).toBe(73);
    expect(model.observedExtent?.firstDayKey).toBe("2026-01-01");
    expect(model.observedExtent?.lastDayKey).toBe("2026-09-21");
  });

  it("excludes out-of-range points from plot and High/Low/Change", () => {
    const points = [
      pt("2025-08-10", 70),
      pt("2025-09-21", 73),
      pt("2026-09-21", 74.3),
    ];
    const model = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points,
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.points.map((p) => p.dayKey)).toEqual(["2025-09-21", "2026-09-21"]);
    expect(model.low).toBe(73);
    expect(model.high).toBe(74.3);
    expect(model.change).toBeCloseTo(1.3, 5);
    expect(model.points.every((p) => p.dayKey !== "2025-08-10")).toBe(true);
  });

  it("All uses earliest-to-latest Change when >=2 points", () => {
    const points = [pt("2025-08-10", 70), pt("2026-09-21", 74.3)];
    const model = buildBodyMetricTrendDetailModel({
      range: "All",
      points,
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.change).toBeCloseTo(4.3, 5);
    expect(model.changeUnavailableDueToPartialCoverage).toBe(false);
  });

  it("keeps same-day observations ordered by observedAt (no average invent)", () => {
    const points = [
      pt("2026-09-16", 74.0, "2026-09-16T08:00:00.000Z"),
      pt("2026-09-16", 74.8, "2026-09-16T18:00:00.000Z"),
    ];
    const model = buildBodyMetricTrendDetailModel({
      range: "7D",
      points,
      stats: { change: 0.8, avg: 74.4, high: 74.8, low: 74.0 },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(model.points).toHaveLength(2);
    expect(model.latest?.valueKg).toBe(74.8);
    expect(model.points[0]!.weightKg).toBe(74.0);
    expect(model.change).toBeCloseTo(0.8, 5);
  });

  it("accessibility summary avoids judgment language", () => {
    const copy = buildBodyMetricTrendAccessibilitySummary({
      metricTitle: "Weight",
      rangeLabel: "the past year",
      latestLabel: "163.8 lb",
      changeLabel: "+1.3 lb",
      averageLabel: null,
      highLabel: "166.5 lb",
      lowLabel: "162.1 lb",
      status: "ready",
      changeUnavailableDueToPartialCoverage: false,
      observedCoverageLabel: "Jan 1, 2026 – Sep 21, 2026",
    });
    expect(copy).toMatch(/Weight trend for the past year/);
    expect(copy).toMatch(/Change \+1\.3 lb/);
    expect(copy).toMatch(/data shown from Jan 1, 2026 – Sep 21, 2026/);
    expect(copy).not.toMatch(/healthy|unhealthy|improved|worsened|full period/i);
  });

  it("switching ranges rebuilds Change from each selected plotted series", () => {
    const points = [
      pt("2025-09-21", 73),
      pt("2026-06-23", 74),
      pt("2026-09-21", 74.3),
    ];
    const oneY = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points,
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    const ninety = buildBodyMetricTrendDetailModel({
      range: "90D",
      points,
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "ready",
      anchorDayKey: ANCHOR,
    });
    expect(oneY.change).toBeCloseTo(1.3, 5);
    expect(ninety.points.map((p) => p.dayKey)).toEqual(["2026-06-23", "2026-09-21"]);
    expect(ninety.change).toBeCloseTo(0.3, 5);
    expect(ninety.observedExtent?.firstDayKey).toBe("2026-06-23");
  });
});
