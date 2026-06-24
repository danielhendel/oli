// lib/data/health-baseline/__tests__/buildHealthBaseline.test.ts
import { buildHealthBaseline } from "@/lib/data/health-baseline/buildHealthBaseline";
import type { HealthBaselineInput } from "@/lib/data/health-baseline/healthBaselineInput";
import { buildEmptyHealthAssessmentState } from "@/lib/data/health-assessment/healthAssessmentStore";
import { buildCurrentStateProfile } from "@/lib/data/health-assessment/buildCurrentStateProfile";

function emptyInput(overrides: Partial<HealthBaselineInput> = {}): HealthBaselineInput {
  return {
    todayDayKey: "2026-06-22",
    generatedAt: "2026-06-23T12:00:00.000Z",
    body: {
      weightKg: null,
      bodyFatPercent: null,
      leanMassKg: null,
      bmi: null,
      weightBaselineModel: null,
    },
    activity: { historyModel: null, activeMinutesToday: null },
    strength: { baselineModel: null },
    cardio: { baselineModel: null, restingHeartRateBpm: null, paceMinPerKm: null },
    nutrition: { baselineModel: null, macroTotals90d: null },
    recovery: { sleepBaselineVm: null, hrvRmssd: null, restingHeartRateBpm: null },
    labs: { summary: null },
    ...overrides,
  };
}

describe("buildHealthBaseline", () => {
  it("returns empty baseline for empty data", () => {
    const baseline = buildHealthBaseline(emptyInput());

    expect(baseline.bodyComposition.status).toBe("missing");
    expect(baseline.activity.status).toBe("missing");
    expect(baseline.strength.status).toBe("missing");
    expect(baseline.cardio.status).toBe("missing");
    expect(baseline.nutrition.status).toBe("missing");
    expect(baseline.recovery.status).toBe("missing");
    expect(baseline.labs.status).toBe("missing");
    expect(baseline.dataCompleteness).toBe(0);
    expect(baseline.baselineConfidence).toBe("low");
  });

  it("returns high confidence for full data case", () => {
    const baseline = buildHealthBaseline(
      emptyInput({
        body: {
          weightKg: 80,
          bodyFatPercent: 18,
          leanMassKg: 65,
          bmi: 24.5,
          weightBaselineModel: {
            kind: "ready",
            currentWeightKg: 80,
            referenceWeightKg: 79,
            ninetyDayLowKg: 77,
            ninetyDayHighKg: 82,
            changeFromReferenceKg: 1,
            classification: "maintaining",
            markerFill01: 0.6,
          },
        },
        activity: {
          activeMinutesToday: 45,
          historyModel: {
            rows: [
              {
                key: "day90",
                label: "90 Day",
                hasEnoughData: true,
                averageStepsPerDay: 9000,
                displayValue: "9,000 steps/day",
                tierLabel: "Good",
                tierIndexForBar: 2,
                progressFill01: 0.6,
              },
              {
                key: "day7",
                label: "7 Day",
                hasEnoughData: true,
                averageStepsPerDay: 8500,
                displayValue: "8,500 steps/day",
                tierLabel: "Good",
                tierIndexForBar: 2,
                progressFill01: 0.55,
              },
            ],
            personalizedExplainer: "test",
          },
        },
        strength: {
          baselineModel: {
            avgWorkoutsPerWeek: 4,
            compactValuePrimary: "4.0/wk",
            totalMinutes90d: 600,
            avgMinutesPerWeek: 120,
            ratingTierBand: 4,
            ratingLabel: "High",
            activityTierIndexForBar: 3,
            fillWidth01Override: 0.8,
          },
        },
        cardio: {
          restingHeartRateBpm: 58,
          paceMinPerKm: 5.5,
          baselineModel: {
            kind: "ready",
            averageMilesPerWeek90d: 12,
            totalMiles90d: 150,
            sessions90d: 24,
            totalMinutes90d: 900,
            averageMinutesPerWeek90d: 70,
            tier: "active",
            formattedAverageMilesPerWeek: "12.0 mi/wk",
            formattedAverageMinutesPerWeek: "70 min/wk",
            headlineLabel: "Moderate",
            progressMilesPerWeekScaleValue: 12,
          },
        },
        nutrition: {
          baselineModel: {
            rows: [
              {
                key: "day90",
                label: "90 Day",
                hasEnoughData: true,
                avgKcalPerDay: 2400,
                avgDaysLoggedPerWeek: 5,
                displayValue: "2,400 kcal/day",
              },
            ],
            personalizedExplainer: "test",
          },
          macroTotals90d: {
            totalKcal: 216000,
            proteinG: 16200,
            carbsG: 21600,
            fatG: 7200,
            hasData: true,
          },
        },
        recovery: {
          hrvRmssd: 55,
          restingHeartRateBpm: 58,
          sleepBaselineVm: {
            rows: [
              {
                key: "day90",
                label: "90 Day",
                hasEnoughData: true,
                averageMinutes: 450,
                displayValue: "7h 30m/night",
                statusLabel: "Good",
                statusColor: "#fff",
                statusBackgroundColor: "#000",
                progressFill01: 0.7,
              },
            ],
            personalizedExplainer: "test",
          },
        },
        labs: {
          summary: {
            ok: true,
            uploadCount: 1,
            categories: [
              {
                categoryKey: "metabolic",
                displayName: "Metabolic",
                metrics: [
                  {
                    metricKey: "a1c",
                    displayName: "A1c",
                    latestValueText: "5.4%",
                    collectedAt: "2026-05-01T00:00:00.000Z",
                  },
                ],
              },
            ],
          },
        },
      }),
    );

    expect(baseline.dataCompleteness).toBe(100);
    expect(baseline.baselineConfidence).toBe("high");
    expect(baseline.bodyComposition.weightKg).toBe(80);
    expect(baseline.activity.averageStepsPerDay).toBe(9000);
    expect(baseline.strength.trainingFrequencyPerWeek).toBe(4);
    expect(baseline.cardio.averageDistanceMilesPerWeek).toBe(12);
    expect(baseline.nutrition.averageCaloriesPerDay).toBe(2400);
    expect(baseline.recovery.sleepDurationMinutes).toBe(450);
    expect(baseline.labs.biomarkerCount).toBe(1);
  });

  it("returns partial confidence for partial data", () => {
    const baseline = buildHealthBaseline(
      emptyInput({
        body: { weightKg: 75, bodyFatPercent: null, leanMassKg: null, bmi: null, weightBaselineModel: null },
        activity: {
          activeMinutesToday: 30,
          historyModel: {
            rows: [
              {
                key: "day90",
                label: "90 Day",
                hasEnoughData: true,
                averageStepsPerDay: 6000,
                displayValue: "6,000 steps/day",
                tierLabel: null,
                tierIndexForBar: null,
                progressFill01: null,
              },
            ],
            personalizedExplainer: "test",
          },
        },
      }),
    );

    expect(baseline.dataCompleteness).toBeGreaterThan(0);
    expect(baseline.dataCompleteness).toBeLessThan(100);
    expect(["moderate", "low"]).toContain(baseline.baselineConfidence);
    expect(baseline.bodyComposition.status).toBe("partial");
    expect(baseline.activity.status).toBe("ready");
  });

  it("is deterministic", () => {
    const input = emptyInput({
      body: { weightKg: 70, bodyFatPercent: null, leanMassKg: null, bmi: 22, weightBaselineModel: null },
    });
    expect(buildHealthBaseline(input)).toEqual(buildHealthBaseline(input));
  });

  it("handles invalid category slices without throwing", () => {
    const profile = buildCurrentStateProfile(buildEmptyHealthAssessmentState());
    expect(profile.completionPercent).toBe(0);
    const baseline = buildHealthBaseline(emptyInput());
    expect(baseline.labs.status).toBe("missing");
    expect(baseline.strength.estimatedOneRmKg).toBeNull();
  });
});
