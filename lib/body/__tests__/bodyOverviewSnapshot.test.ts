import type { WeightPoint } from "@/lib/data/useWeightSeries";
import {
  bodyWeightSamplesFromPoints,
  buildBodyOverviewSnapshot,
  buildWeightByDayMap,
  latestWeightPoint,
  weightPointsFromPeekRows,
} from "@/lib/body/bodyOverviewSnapshot";
import { WEIGHT_HERO_DEFAULT_RANGE } from "@/lib/body/weightTrendViewModel";
import { buildWeightHeroGraphModel } from "@/lib/body/weightTrendViewModel";
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";

const TZ = "America/New_York";
const TODAY = "2026-03-31";

function weightPeekRow(day: string, kg: number, observedAt?: string) {
  return {
    id: `w-${day}`,
    observedAt: observedAt ?? `${day}T18:00:00.000Z`,
    sourceId: "apple_health",
    kind: "weight" as const,
    payload: { weightKg: kg, time: observedAt ?? `${day}T18:00:00.000Z` },
  };
}

describe("WEIGHT_HERO_DEFAULT_RANGE", () => {
  it("defaults to 30D", () => {
    expect(WEIGHT_HERO_DEFAULT_RANGE).toBe("30D");
  });
});

describe("latestWeightPoint", () => {
  it("chooses the newest observedAt timestamp", () => {
    const latest = latestWeightPoint([
      { dayKey: "2026-03-31", observedAt: "2026-03-31T08:00:00.000Z", weightKg: 80 },
      { dayKey: "2026-03-31", observedAt: "2026-03-31T20:00:00.000Z", weightKg: 81 },
      { dayKey: "2026-03-30", observedAt: "2026-03-30T12:00:00.000Z", weightKg: 79 },
    ]);
    expect(latest?.weightKg).toBe(81);
    expect(latest?.observedAt).toBe("2026-03-31T20:00:00.000Z");
  });

  it("does not mutate the input array order", () => {
    const input = [
      { dayKey: "2026-03-31", observedAt: "2026-03-31T08:00:00.000Z", weightKg: 80 },
      { dayKey: "2026-03-31", observedAt: "2026-03-31T20:00:00.000Z", weightKg: 81 },
    ];
    const copy = input.map((p) => ({ ...p }));
    latestWeightPoint(input);
    expect(input).toEqual(copy);
  });
});

describe("weightPointsFromPeekRows", () => {
  it("extracts Apple Health weight samples from peek rows", () => {
    const points = weightPointsFromPeekRows([weightPeekRow("2026-03-31", 80)], TZ);
    expect(points).toHaveLength(1);
    expect(points[0]?.weightKg).toBe(80);
    expect(points[0]?.sourceId).toBe("apple_health");
  });
});

describe("buildBodyOverviewSnapshot", () => {
  it("returns the same latest weight for Dash and Body shared snapshot", () => {
    const points: WeightPoint[] = [
      {
        dayKey: "2026-03-31",
        observedAt: "2026-03-31T10:00:00.000Z",
        weightKg: 80,
        sourceId: "apple_health",
      },
    ];
    const byDay = buildWeightByDayMap(points);
    const snap = buildBodyOverviewSnapshot({
      todayDayKey: TODAY,
      weightPoints: points,
      peekRows: [],
      snapshotPeekRows: [],
      dailyFactsBody: null,
      byDay,
      tz: TZ,
    });
    expect(snap.weightKg).toBe(80);
    expect(snap.overviewDay).toBe("2026-03-31");
    expect(snap.hasAnyMetric).toBe(true);
  });

  it("prefers daily facts body fat but keeps weight from series", () => {
    const day = "2026-03-30";
    const points: WeightPoint[] = [
      {
        dayKey: day,
        observedAt: `${day}T10:00:00.000Z`,
        weightKg: 78,
        sourceId: "apple_health",
      },
    ];
    const snap = buildBodyOverviewSnapshot({
      todayDayKey: TODAY,
      weightPoints: points,
      peekRows: [
        {
          id: "bf",
          observedAt: `${TODAY}T12:00:00.000Z`,
          sourceId: "apple_health",
          kind: "body_composition",
          payload: { bodyFatPercent: 17 },
        },
      ],
      snapshotPeekRows: [],
      dailyFactsBody: { bodyFatPercent: 16 },
      byDay: buildWeightByDayMap(points),
      tz: TZ,
    });
    expect(snap.overviewDay).toBe(day);
    expect(snap.weightKg).toBe(78);
    expect(snap.bodyFatPercent).toBe(16);
  });

  it("returns empty state when no metrics exist", () => {
    const snap = buildBodyOverviewSnapshot({
      todayDayKey: TODAY,
      weightPoints: [],
      peekRows: [],
      snapshotPeekRows: [],
      dailyFactsBody: null,
      byDay: new Map(),
      tz: TZ,
    });
    expect(snap.hasAnyMetric).toBe(false);
    expect(snap.overviewDay).toBeNull();
  });
});

describe("bodyWeightSamplesFromPoints", () => {
  it("dedupes to one sample per day using latest timestamp within the day", () => {
    const samples = bodyWeightSamplesFromPoints([
      { dayKey: "2026-03-31", observedAt: "2026-03-31T08:00:00.000Z", weightKg: 80 },
      { dayKey: "2026-03-31", observedAt: "2026-03-31T20:00:00.000Z", weightKg: 81 },
    ]);
    expect(samples).toHaveLength(1);
    expect(samples[0]?.weightKg).toBe(81);
  });
});

describe("30D chart delta", () => {
  function s(dayKey: string, weightKg: number): BodyWeightSample {
    return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
  }

  it("calculates delta over 30 days with default range", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: [s("2026-03-01", 74), s("2026-03-31", 80)],
      unit: "lb",
      selectedRange: WEIGHT_HERO_DEFAULT_RANGE,
    });
    expect(m.selectedRangeCompactLabel).toBe("30D");
    expect(m.deltaLabel).toMatch(/over 30 days$/);
  });
});

describe("buildWeightByDayMap", () => {
  it("sorts same-day samples newest-first without mutating the input array", () => {
    const input: WeightPoint[] = [
      {
        dayKey: "2026-03-31",
        observedAt: "2026-03-31T08:00:00.000Z",
        weightKg: 80,
        sourceId: "apple_health",
      },
      {
        dayKey: "2026-03-31",
        observedAt: "2026-03-31T20:00:00.000Z",
        weightKg: 81,
        sourceId: "apple_health",
      },
    ];
    const copy = input.map((p) => ({ ...p }));
    const byDay = buildWeightByDayMap(input);
    expect(byDay.get("2026-03-31")?.[0]?.weightKg).toBe(81);
    expect(input).toEqual(copy);
  });
});
