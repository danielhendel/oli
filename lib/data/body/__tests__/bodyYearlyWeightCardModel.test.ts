import { buildBodyYearlyWeightCardModel } from "@/lib/data/body/bodyYearlyWeightCardModel";
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";

const TODAY = "2026-03-31";

function s(dayKey: string, weightKg: number): BodyWeightSample {
  return { dayKey, observedAt: `${dayKey}T08:00:00.000Z`, weightKg };
}

const CURRENT_YEAR_SAMPLES: BodyWeightSample[] = [
  s("2026-01-15", 79),
  s("2026-02-10", 80),
  s("2026-03-05", 81),
  s("2026-03-25", 82),
];

describe("buildBodyYearlyWeightCardModel", () => {
  it("builds 12 monthly points with title, average, and year-over-year delta for the current year", () => {
    const m = buildBodyYearlyWeightCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      samples: CURRENT_YEAR_SAMPLES,
      unit: "lb",
    });
    expect(m.title).toBe("2026 Weight");
    expect(m.rangeLabel).toBe("2026");
    expect(m.isCurrentYear).toBe(true);
    expect(m.hasData).toBe(true);
    expect(m.months).toHaveLength(12);
    // mean of all daily-latest weights: (79+80+81+82)/4 = 80.5 kg -> 177.5 lb
    expect(m.averageDisplay).toBe("177.5");
    // first measured month (Jan 79) -> last measured month (Mar avg 81.5) = +2.5 kg -> +5.5 lb
    expect(m.deltaLabel).toBe("+5.5 lb");
  });

  it("flags current and future months and nulls out months without readings", () => {
    const m = buildBodyYearlyWeightCardModel({
      selectedYear: 2026,
      todayDayKey: TODAY,
      samples: CURRENT_YEAR_SAMPLES,
      unit: "lb",
    });
    const march = m.months[2]!;
    expect(march.isCurrentMonth).toBe(true);
    expect(march.averageKg).toBeCloseTo(81.5, 6);
    // April..December are in the future relative to today
    for (let i = 3; i < 12; i += 1) {
      expect(m.months[i]!.isFutureMonth).toBe(true);
      expect(m.months[i]!.averageKg).toBeNull();
    }
  });

  it("returns an empty model for a prior year with no readings", () => {
    const m = buildBodyYearlyWeightCardModel({
      selectedYear: 2024,
      todayDayKey: TODAY,
      samples: CURRENT_YEAR_SAMPLES,
      unit: "lb",
    });
    expect(m.hasData).toBe(false);
    expect(m.isEmpty).toBe(true);
    expect(m.averageDisplay).toBe("");
    expect(m.deltaLabel).toBeNull();
    expect(m.months.every((mo) => mo.averageKg === null)).toBe(true);
  });

  it("aggregates a prior year across full calendar months (no future flag)", () => {
    const m = buildBodyYearlyWeightCardModel({
      selectedYear: 2025,
      todayDayKey: TODAY,
      samples: [s("2025-02-01", 70), s("2025-11-20", 74)],
      unit: "lb",
    });
    expect(m.hasData).toBe(true);
    expect(m.months.some((mo) => mo.isFutureMonth)).toBe(false);
    expect(m.months[1]!.averageKg).toBe(70);
    expect(m.months[10]!.averageKg).toBe(74);
  });

  it("treats a future year as entirely empty (future-year bound)", () => {
    const m = buildBodyYearlyWeightCardModel({
      selectedYear: 2027,
      todayDayKey: TODAY,
      samples: CURRENT_YEAR_SAMPLES,
      unit: "lb",
    });
    expect(m.hasData).toBe(false);
    expect(m.months.every((mo) => mo.isFutureMonth && mo.averageKg === null)).toBe(true);
  });
});
