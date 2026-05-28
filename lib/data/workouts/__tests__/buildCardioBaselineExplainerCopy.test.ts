import {
  CARDIO_BASELINE_GENERIC_EXPLAINER,
  buildCardioBaselineExplainerCopy,
  computeCardioBaselineSevenDayTrendPct,
  type CardioHistorySummaryRow,
} from "@/lib/data/workouts/cardioHistorySummaryModel";

function row(opts: {
  key: CardioHistorySummaryRow["key"];
  label: CardioHistorySummaryRow["label"];
  hasEnoughData: boolean;
  averageMilesPerWeek: number | null;
}): CardioHistorySummaryRow {
  return {
    key: opts.key,
    label: opts.label,
    hasEnoughData: opts.hasEnoughData,
    totalMiles: null,
    averageMilesPerWeek: opts.averageMilesPerWeek,
    totalMinutes: null,
    averageMinutesPerWeek: null,
    displayValue: opts.averageMilesPerWeek != null ? `${opts.averageMilesPerWeek.toFixed(1)} mi per week` : "—",
    tierLabel: null,
    tierIndexForBar: null,
    progressFill01: null,
  };
}

describe("computeCardioBaselineSevenDayTrendPct", () => {
  it("returns null when baseline is unusable", () => {
    expect(computeCardioBaselineSevenDayTrendPct(5, 0)).toBeNull();
    expect(computeCardioBaselineSevenDayTrendPct(5, -1)).toBeNull();
    expect(computeCardioBaselineSevenDayTrendPct(Number.NaN, 5)).toBeNull();
  });
  it("rounds the signed delta", () => {
    expect(computeCardioBaselineSevenDayTrendPct(6, 5)).toBe(20);
    expect(computeCardioBaselineSevenDayTrendPct(4, 5)).toBe(-20);
    expect(computeCardioBaselineSevenDayTrendPct(5, 5)).toBe(0);
  });
});

describe("buildCardioBaselineExplainerCopy", () => {
  it("falls back when 90 Day isn't ready", () => {
    const out = buildCardioBaselineExplainerCopy({
      day90Row: row({ key: "day90", label: "90 Day", hasEnoughData: false, averageMilesPerWeek: null }),
      day7Row: row({ key: "thisWeek", label: "7 Day", hasEnoughData: true, averageMilesPerWeek: 3.5 }),
    });
    expect(out).toBe(CARDIO_BASELINE_GENERIC_EXPLAINER);
  });

  it("baseline-only sentence when 7 Day not ready", () => {
    const out = buildCardioBaselineExplainerCopy({
      day90Row: row({ key: "day90", label: "90 Day", hasEnoughData: true, averageMilesPerWeek: 4.2 }),
      day7Row: row({ key: "thisWeek", label: "7 Day", hasEnoughData: false, averageMilesPerWeek: null }),
    });
    expect(out).toBe("Your 90-day cardio baseline is 4.2 mi/week.");
  });

  it("baseline + above-baseline trend sentence", () => {
    const out = buildCardioBaselineExplainerCopy({
      day90Row: row({ key: "day90", label: "90 Day", hasEnoughData: true, averageMilesPerWeek: 4.0 }),
      day7Row: row({ key: "thisWeek", label: "7 Day", hasEnoughData: true, averageMilesPerWeek: 5.0 }),
    });
    expect(out).toBe(
      "Your 90-day cardio baseline is 4.0 mi/week. Over the past 7 completed days, you're averaging 5.0 mi/week — about 25% above your baseline.",
    );
  });

  it("baseline + below-baseline trend sentence", () => {
    const out = buildCardioBaselineExplainerCopy({
      day90Row: row({ key: "day90", label: "90 Day", hasEnoughData: true, averageMilesPerWeek: 5.0 }),
      day7Row: row({ key: "thisWeek", label: "7 Day", hasEnoughData: true, averageMilesPerWeek: 4.0 }),
    });
    expect(out).toBe(
      "Your 90-day cardio baseline is 5.0 mi/week. Over the past 7 completed days, you're averaging 4.0 mi/week — about 20% below your baseline.",
    );
  });

  it("baseline + about-the-same when rounded delta is 0", () => {
    const out = buildCardioBaselineExplainerCopy({
      day90Row: row({ key: "day90", label: "90 Day", hasEnoughData: true, averageMilesPerWeek: 4.0 }),
      day7Row: row({ key: "thisWeek", label: "7 Day", hasEnoughData: true, averageMilesPerWeek: 4.0 }),
    });
    expect(out).toBe(
      "Your 90-day cardio baseline is 4.0 mi/week. Over the past 7 completed days, you're averaging 4.0 mi/week — about the same as your baseline.",
    );
  });
});
