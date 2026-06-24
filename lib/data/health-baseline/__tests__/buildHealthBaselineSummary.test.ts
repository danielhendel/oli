// lib/data/health-baseline/__tests__/buildHealthBaselineSummary.test.ts
import { buildHealthBaseline } from "@/lib/data/health-baseline/buildHealthBaseline";
import { buildHealthBaselineSummary } from "@/lib/data/health-baseline/buildHealthBaselineSummary";
import type { HealthBaselineInput } from "@/lib/data/health-baseline/healthBaselineInput";
import { buildCurrentStateProfile } from "@/lib/data/health-assessment/buildCurrentStateProfile";
import { buildEmptyHealthAssessmentState } from "@/lib/data/health-assessment/healthAssessmentStore";

function minimalBaselineInput(): HealthBaselineInput {
  return {
    todayDayKey: "2026-06-22",
    generatedAt: "2026-06-23T12:00:00.000Z",
    body: { weightKg: null, bodyFatPercent: null, leanMassKg: null, bmi: null, weightBaselineModel: null },
    activity: { historyModel: null, activeMinutesToday: null },
    strength: { baselineModel: null },
    cardio: { baselineModel: null, restingHeartRateBpm: null, paceMinPerKm: null },
    nutrition: { baselineModel: null, macroTotals90d: null },
    recovery: { sleepBaselineVm: null, hrvRmssd: null, restingHeartRateBpm: null },
    labs: { summary: null },
  };
}

describe("buildHealthBaselineSummary", () => {
  it("lists missing areas for empty baseline", () => {
    const baseline = buildHealthBaseline(minimalBaselineInput());
    const summary = buildHealthBaselineSummary({
      baseline,
      currentStateProfile: buildCurrentStateProfile(buildEmptyHealthAssessmentState()),
    });

    expect(summary.areasMissingData.length).toBeGreaterThan(0);
    expect(summary.strengths.length).toBe(0);
    expect(summary.baselineConfidence).toBe("low");
    expect(summary.dataCompleteness).toBe(0);
    expect(summary.mostIncompleteMetrics.length).toBeGreaterThan(0);
  });

  it("identifies strengths when activity data is ready", () => {
    const baseline = buildHealthBaseline({
      ...minimalBaselineInput(),
      activity: {
        activeMinutesToday: 40,
        historyModel: {
          rows: [
            {
              key: "day90",
              label: "90 Day",
              hasEnoughData: true,
              averageStepsPerDay: 10000,
              displayValue: "10,000 steps/day",
              tierLabel: "Good",
              tierIndexForBar: 2,
              progressFill01: 0.7,
            },
          ],
          personalizedExplainer: "test",
        },
      },
    });

    const summary = buildHealthBaselineSummary({ baseline, currentStateProfile: null });
    expect(summary.strengths).toContain("Consistent activity data");
    expect(summary.mostReliableMetrics).toContain("90-day activity steps");
  });

  it("is deterministic", () => {
    const baseline = buildHealthBaseline(minimalBaselineInput());
    const input = { baseline, currentStateProfile: null };
    expect(buildHealthBaselineSummary(input)).toEqual(buildHealthBaselineSummary(input));
  });
});
