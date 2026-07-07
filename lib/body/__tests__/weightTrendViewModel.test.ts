import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import {
  buildWeightHeroGraphModel,
  buildWeightHeroAxisTicks,
  WEIGHT_HERO_INSUFFICIENT_TREND_COPY,
  WEIGHT_HERO_RANGE_OPTIONS,
  windowStartForWeightHeroRange,
  weightHeroRangeOption,
} from "@/lib/body/weightTrendViewModel";

const TODAY = "2026-03-31";

function s(dayKey: string, weightKg: number): BodyWeightSample {
  return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
}

describe("weight hero range options", () => {
  it("maps compact labels for all supported ranges", () => {
    expect(WEIGHT_HERO_RANGE_OPTIONS.map((o) => o.compactLabel)).toEqual([
      "7D",
      "30D",
      "3M",
      "6M",
      "1Y",
      "3Y",
      "5Y",
      "10Y",
    ]);
    expect(weightHeroRangeOption("30D").feedbackLabel).toBe("30 days");
    expect(weightHeroRangeOption("3M").feedbackLabel).toBe("3 months");
    expect(weightHeroRangeOption("1Y").feedbackLabel).toBe("1 year");
  });
});

describe("windowStartForWeightHeroRange", () => {
  it("uses calendar day keys anchored on local today", () => {
    expect(windowStartForWeightHeroRange("7D", TODAY)).toBe("2026-03-24");
    expect(windowStartForWeightHeroRange("30D", TODAY)).toBe("2026-03-01");
    expect(windowStartForWeightHeroRange("1Y", TODAY)).toBe("2025-03-31");
  });
});

describe("buildWeightHeroGraphModel", () => {
  const longSeries: BodyWeightSample[] = [
    s("2024-01-15", 77),
    s("2025-06-01", 78),
    s("2026-01-15", 79),
    s("2026-03-05", 79),
    s("2026-03-25", 81),
    s("2026-03-31", 80),
  ];

  it("filters 7-day readings correctly", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: longSeries,
      unit: "lb",
      selectedRange: "7D",
    });
    expect(m.chartPoints.map((p) => p.dayKey)).toEqual(["2026-03-25", "2026-03-31"]);
    expect(m.selectedRangeCompactLabel).toBe("7D");
  });

  it("filters 30-day readings correctly", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: longSeries,
      unit: "lb",
      selectedRange: "30D",
    });
    expect(m.chartPoints.map((p) => p.dayKey)).toEqual([
      "2026-03-05",
      "2026-03-25",
      "2026-03-31",
    ]);
  });

  it("filters 3-month readings correctly", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: longSeries,
      unit: "lb",
      selectedRange: "3M",
    });
    expect(m.chartPoints.map((p) => p.dayKey)).toEqual([
      "2026-01-15",
      "2026-03-05",
      "2026-03-25",
      "2026-03-31",
    ]);
  });

  it("filters 1-year readings correctly", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: longSeries,
      unit: "lb",
      selectedRange: "1Y",
    });
    expect(m.chartPoints.map((p) => p.dayKey)).toEqual([
      "2025-06-01",
      "2026-01-15",
      "2026-03-05",
      "2026-03-25",
      "2026-03-31",
    ]);
  });

  it("uses earliest available point within range for delta", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: [s("2026-03-25", 81), s("2026-03-31", 80)],
      unit: "lb",
      selectedRange: "7D",
    });
    expect(m.earliestPointDayKey).toBe("2026-03-25");
    expect(m.latestPointDayKey).toBe("2026-03-31");
    expect(m.deltaLabel).toMatch(/-2\.2 lb over 7 days/);
  });

  it("matches delta label to the selected range feedback text", () => {
    const samples7: BodyWeightSample[] = [s("2026-03-25", 81), s("2026-03-31", 80)];
    const samples30: BodyWeightSample[] = [s("2026-03-01", 79), s("2026-03-31", 80)];
    const m7 = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: samples7,
      unit: "lb",
      selectedRange: "7D",
    });
    const m30 = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: samples30,
      unit: "lb",
      selectedRange: "30D",
    });
    expect(m7.deltaLabel).toMatch(/over 7 days$/);
    expect(m30.deltaLabel).toMatch(/over 30 days$/);
  });

  it("returns insufficient trend state for a single point", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: [s("2026-03-31", 80)],
      unit: "lb",
      selectedRange: "7D",
    });
    expect(m.insufficientTrend).toBe(true);
    expect(m.hasLine).toBe(false);
    expect(m.deltaLabel).toBeNull();
  });

  it("returns empty state when no readings exist in range", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: [s("2020-01-01", 70)],
      unit: "lb",
      selectedRange: "7D",
    });
    expect(m.isEmpty).toBe(true);
    expect(m.chartPoints).toHaveLength(0);
  });

  it("marks today on chart points", () => {
    const m = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples: [s("2026-03-25", 81), s("2026-03-31", 80)],
      unit: "lb",
      selectedRange: "7D",
    });
    expect(m.chartPoints.find((p) => p.dayKey === TODAY)?.isToday).toBe(true);
  });

  it("includes target band only when provided", () => {
    const samples: BodyWeightSample[] = [s("2026-03-25", 81), s("2026-03-31", 80)];
    const withBand = buildWeightHeroGraphModel({
      todayDayKey: TODAY,
      samples,
      unit: "lb",
      selectedRange: "7D",
      targetBandKg: { loKg: 60, hiKg: 75 },
    });
    expect(withBand.targetBandKg).toEqual({ loKg: 60, hiKg: 75 });
  });
});

describe("buildWeightHeroAxisTicks", () => {
  const points = [
    { dayKey: "2026-03-25" as const },
    { dayKey: "2026-03-27" as const },
    { dayKey: "2026-03-29" as const },
    { dayKey: "2026-03-31" as const },
  ];

  it("uses weekday labels for 7D", () => {
    const ticks = buildWeightHeroAxisTicks(points, "7D");
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((t) => t.label.length >= 1)).toBe(true);
  });

  it("uses month/day labels for 30D", () => {
    const ticks = buildWeightHeroAxisTicks(points, "30D");
    expect(ticks[0]?.label).toBe("Mar 25");
    expect(ticks[ticks.length - 1]?.label).toBe("Mar 31");
  });

  it("uses month labels for 3M", () => {
    const ticks = buildWeightHeroAxisTicks(
      [
        { dayKey: "2026-01-15" },
        { dayKey: "2026-02-10" },
        { dayKey: "2026-03-31" },
      ],
      "3M",
    );
    expect(ticks.some((t) => t.label === "Jan")).toBe(true);
    expect(ticks.some((t) => t.label === "Mar")).toBe(true);
  });
});

describe("insufficient trend copy", () => {
  it("exposes stable empty-trend messaging", () => {
    expect(WEIGHT_HERO_INSUFFICIENT_TREND_COPY).toBe("Not enough data for trend");
  });
});
