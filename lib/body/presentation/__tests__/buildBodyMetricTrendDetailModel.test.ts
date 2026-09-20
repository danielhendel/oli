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

describe("buildBodyMetricTrendDetailModel", () => {
  it("maps partial and error honestly", () => {
    expect(
      buildBodyMetricTrendDetailModel({
        range: "1Y",
        points: [],
        stats: { change: null, avg: null, high: null, low: null },
        trendsStatus: "partial",
      }).status,
    ).toBe("partial");

    const err = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points: [],
      stats: { change: null, avg: null, high: null, low: null },
      trendsStatus: "error",
      errorMessage: "network",
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
    });
    expect(model.status).toBe("insufficient");
    expect(model.latest?.valueKg).toBe(74.3);
    expect(model.change).toBeNull();
    expect(model.average).toBe(74.3);
    expect(model.high).toBe(74.3);
    expect(model.low).toBe(74.3);
  });

  it("multiple points expose change/average/high/low from stats", () => {
    const points = [
      pt("2026-09-01", 73),
      pt("2026-09-10", 75.5),
      pt("2026-09-16", 74.3),
    ];
    const model = buildBodyMetricTrendDetailModel({
      range: "1Y",
      points,
      stats: { change: 1.3, avg: 74.2666, high: 75.5, low: 73 },
      trendsStatus: "ready",
    });
    expect(model.status).toBe("ready");
    expect(model.latest?.dayKey).toBe("2026-09-16");
    expect(model.change).toBe(1.3);
    expect(model.high).toBe(75.5);
    expect(model.low).toBe(73);
    expect(model.sameDayPolicy).toBe("all_observations_by_observedAt");
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
    });
    expect(model.points).toHaveLength(2);
    expect(model.latest?.valueKg).toBe(74.8);
    expect(model.points[0]!.weightKg).toBe(74.0);
  });

  it("accessibility summary avoids judgment language", () => {
    const copy = buildBodyMetricTrendAccessibilitySummary({
      metricTitle: "Weight",
      rangeLabel: "the past year",
      latestLabel: "163.8 lb",
      changeLabel: "1.3 lb",
      averageLabel: "164.0 lb",
      highLabel: "166.5 lb",
      lowLabel: "162.1 lb",
      status: "ready",
    });
    expect(copy).toMatch(/Weight trend for the past year/);
    expect(copy).toMatch(/Latest 163\.8 lb/);
    expect(copy).not.toMatch(/healthy|unhealthy|improved|worsened/i);
  });
});
