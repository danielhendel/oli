import { describe, expect, it } from "@jest/globals";

import {
  STRENGTH_BASELINE_GENERIC_EXPLAINER,
  buildStrengthBaselineExplainerCopy,
  computeStrengthBaselineSevenDayTrendPct,
  type StrengthHistorySummaryRow,
} from "@/lib/data/workouts/strengthHistorySummaryModel";

function row(
  key: StrengthHistorySummaryRow["key"],
  label: StrengthHistorySummaryRow["label"],
  avg: number | null,
): StrengthHistorySummaryRow {
  if (avg == null) {
    return {
      key,
      label,
      hasEnoughData: false,
      averageSessionsPerWeek: null,
      displayValue: "—",
      tierLabel: null,
      tierIndexForBar: null,
      progressFill01: null,
    };
  }
  return {
    key,
    label,
    hasEnoughData: true,
    averageSessionsPerWeek: avg,
    displayValue: `${avg.toFixed(1)} per week`,
    tierLabel: "High",
    tierIndexForBar: 3,
    progressFill01: Math.min(1, avg / 7),
  };
}

describe("computeStrengthBaselineSevenDayTrendPct", () => {
  it("returns positive rounded percent when 7 Day exceeds baseline", () => {
    expect(computeStrengthBaselineSevenDayTrendPct(4.4, 4.0)).toBe(10);
  });

  it("returns negative rounded percent when 7 Day is below baseline", () => {
    expect(computeStrengthBaselineSevenDayTrendPct(3.0, 4.5)).toBe(-33);
  });

  it("returns 0 when 7 Day and baseline match", () => {
    expect(computeStrengthBaselineSevenDayTrendPct(3.5, 3.5)).toBe(0);
  });

  it("returns null when baseline is zero or non-finite", () => {
    expect(computeStrengthBaselineSevenDayTrendPct(2, 0)).toBeNull();
    expect(computeStrengthBaselineSevenDayTrendPct(2, Number.NaN)).toBeNull();
    expect(computeStrengthBaselineSevenDayTrendPct(Number.POSITIVE_INFINITY, 4)).toBeNull();
  });
});

describe("buildStrengthBaselineExplainerCopy", () => {
  it("returns the generic fallback when 90 Day baseline is missing", () => {
    expect(
      buildStrengthBaselineExplainerCopy({
        day90Row: row("day90", "90 Day", null),
        day7Row: row("thisWeek", "7 Day", 3.0),
      }),
    ).toBe(STRENGTH_BASELINE_GENERIC_EXPLAINER);
    expect(
      buildStrengthBaselineExplainerCopy({ day90Row: null, day7Row: null }),
    ).toBe(STRENGTH_BASELINE_GENERIC_EXPLAINER);
  });

  it("returns baseline-only copy when 7 Day is missing", () => {
    const copy = buildStrengthBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 4.5),
      day7Row: row("thisWeek", "7 Day", null),
    });
    expect(copy).toBe("Your 90-day strength baseline is 4.5/week.");
  });

  it("includes 'above your baseline' phrasing when 7 Day exceeds the 90 Day baseline", () => {
    const copy = buildStrengthBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 4.0),
      day7Row: row("thisWeek", "7 Day", 4.4),
    });
    expect(copy).toContain("Your 90-day strength baseline is 4.0/week.");
    expect(copy).toContain("Over the past 7 completed days, you're averaging 4.4/week");
    expect(copy).toContain("about 10% above your baseline");
  });

  it("includes 'below your baseline' phrasing when 7 Day is under the 90 Day baseline", () => {
    const copy = buildStrengthBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 4.5),
      day7Row: row("thisWeek", "7 Day", 3.0),
    });
    expect(copy).toContain("Your 90-day strength baseline is 4.5/week.");
    expect(copy).toContain("about 33% below your baseline");
  });

  it("uses 'about the same as' phrasing when rounded delta is zero", () => {
    const copy = buildStrengthBaselineExplainerCopy({
      day90Row: row("day90", "90 Day", 4.0),
      day7Row: row("thisWeek", "7 Day", 4.01),
    });
    expect(copy).toContain("about the same as your baseline");
    expect(copy).not.toContain("above your baseline");
    expect(copy).not.toContain("below your baseline");
  });
});
