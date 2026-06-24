// lib/data/target-state/__tests__/buildTargetStateRoadmap.test.ts
import { buildEmptyHealthAssessmentState } from "@/lib/data/health-assessment/healthAssessmentStore";
import { buildCurrentStateProfile } from "@/lib/data/health-assessment/buildCurrentStateProfile";
import { buildHealthBaseline } from "@/lib/data/health-baseline/buildHealthBaseline";
import type { HealthBaselineInput } from "@/lib/data/health-baseline/healthBaselineInput";
import { buildTargetStateRoadmap } from "@/lib/data/target-state/buildTargetStateRoadmap";
import { deriveTargetPriority } from "@/lib/data/target-state/deriveTargetPriority";
import { deriveNextLevel } from "@/lib/data/target-state/deriveNextLevel";
import { deriveMilestonesForMetric } from "@/lib/data/target-state/deriveMilestonesForMetric";
import { BMI_METRIC } from "@/lib/classifications/bodyComposition";
import { CLASSIFICATION_FRAMEWORK_VERSION } from "@/lib/classifications/types";

function fullBaselineInput(): HealthBaselineInput {
  return {
    todayDayKey: "2026-06-22",
    generatedAt: "2026-06-23T12:00:00.000Z",
    body: {
      weightKg: 80,
      bodyFatPercent: 22,
      leanMassKg: 65,
      bmi: 26,
      weightBaselineModel: null,
    },
    activity: {
      historyModel: {
        rows: [
          {
            key: "day90",
            label: "90 Day",
            hasEnoughData: true,
            averageStepsPerDay: 8500,
            displayValue: "8,500",
            tierLabel: null,
            tierIndexForBar: null,
            progressFill01: null,
          },
        ],
        personalizedExplainer: "test",
      },
      activeMinutesToday: 40,
    },
    strength: { baselineModel: null },
    cardio: { baselineModel: null, restingHeartRateBpm: 62, paceMinPerKm: null },
    nutrition: {
      baselineModel: null,
      macroTotals90d: { totalKcal: 0, proteinG: 14400, carbsG: 0, fatG: 0, hasData: true },
    },
    recovery: {
      sleepBaselineVm: {
        rows: [
          {
            key: "day90",
            label: "90 Day",
            hasEnoughData: true,
            averageMinutes: 420,
            displayValue: "7h",
            statusLabel: "Good",
            statusColor: "#fff",
            statusBackgroundColor: "#000",
            progressFill01: 0.7,
          },
        ],
        personalizedExplainer: "test",
      },
      hrvRmssd: null,
      restingHeartRateBpm: null,
    },
    labs: { summary: null },
  };
}

describe("buildTargetStateRoadmap", () => {
  it("returns empty roadmap when baseline is missing", () => {
    const roadmap = buildTargetStateRoadmap({
      baseline: null,
      currentStateProfile: buildCurrentStateProfile(buildEmptyHealthAssessmentState()),
    });
    expect(roadmap.domains).toEqual([]);
    expect(roadmap.dataCoveragePercent).toBe(0);
    expect(roadmap.targetStateConfidence).toBe("low");
  });

  it("builds roadmap with classified metrics for full data", () => {
    const baseline = buildHealthBaseline(fullBaselineInput());
    const profile = buildCurrentStateProfile({
      ...buildEmptyHealthAssessmentState(),
      answers: {
        "goals-primary": {
          questionId: "goals-primary",
          category: "goals",
          value: "fat-loss",
        },
      },
    });

    const roadmap = buildTargetStateRoadmap({
      baseline,
      currentStateProfile: profile,
      sex: "male",
      generatedAt: "2026-06-23T12:00:00.000Z",
    });

    expect(roadmap.classificationVersion).toBe(CLASSIFICATION_FRAMEWORK_VERSION);
    expect(roadmap.primaryGoal).toBe("fat-loss");
    expect(roadmap.domains.length).toBeGreaterThan(0);
    expect(roadmap.dataCoveragePercent).toBeGreaterThan(0);

    const bmiMetric = roadmap.domains
      .flatMap((d) => d.metrics)
      .find((m) => m.metricId === "bmi");
    expect(bmiMetric?.currentLevel).toBe(3);
    expect(bmiMetric?.nextLevel).toBe(4);
    expect(bmiMetric?.classificationVersion).toBe("1.0");
    expect(bmiMetric?.milestoneTargets.length).toBe(6);
  });

  it("handles partial data without fabricating unavailable metrics", () => {
    const baseline = buildHealthBaseline({
      ...fullBaselineInput(),
      body: {
        weightKg: null,
        bodyFatPercent: null,
        leanMassKg: null,
        bmi: null,
        weightBaselineModel: null,
      },
      activity: { historyModel: null, activeMinutesToday: null },
    });

    const roadmap = buildTargetStateRoadmap({
      baseline,
      currentStateProfile: null,
      sex: "male",
    });

    const unavailable = roadmap.domains
      .flatMap((d) => d.metrics)
      .filter((m) => m.dataStatus === "unavailable");
    expect(unavailable.length).toBeGreaterThan(0);
    for (const m of unavailable) {
      expect(m.currentLevel).toBeNull();
      expect(m.nextLevel).toBeNull();
    }
  });

  it("maintains optimal when metric is Level 5", () => {
    const baseline = buildHealthBaseline({
      ...fullBaselineInput(),
      body: {
        weightKg: 70,
        bodyFatPercent: 10,
        leanMassKg: 60,
        bmi: 21,
        weightBaselineModel: null,
      },
      activity: {
        historyModel: {
          rows: [
            {
              key: "day90",
              label: "90 Day",
              hasEnoughData: true,
              averageStepsPerDay: 13000,
              displayValue: "13,000",
              tierLabel: null,
              tierIndexForBar: null,
              progressFill01: null,
            },
          ],
          personalizedExplainer: "test",
        },
        activeMinutesToday: 60,
      },
    });

    const roadmap = buildTargetStateRoadmap({
      baseline,
      currentStateProfile: null,
      sex: "male",
    });

    const steps = roadmap.domains
      .flatMap((d) => d.metrics)
      .find((m) => m.metricId === "daily-steps");
    expect(steps?.dataStatus).toBe("maintain-optimal");
    expect(steps?.nextLevel).toBeNull();
  });

  it("primary goal affects priority only, not classification thresholds", () => {
    const baseline = buildHealthBaseline(fullBaselineInput());
    const fatLoss = buildTargetStateRoadmap({
      baseline,
      currentStateProfile: { ...buildCurrentStateProfile(buildEmptyHealthAssessmentState()), primaryGoal: "fat-loss" },
      sex: "male",
    });
    const muscleGain = buildTargetStateRoadmap({
      baseline,
      currentStateProfile: {
        ...buildCurrentStateProfile(buildEmptyHealthAssessmentState()),
        primaryGoal: "muscle-gain",
      },
      sex: "male",
    });

    const fatLossBmi = fatLoss.domains.flatMap((d) => d.metrics).find((m) => m.metricId === "bmi");
    const muscleBmi = muscleGain.domains.flatMap((d) => d.metrics).find((m) => m.metricId === "bmi");
    expect(fatLossBmi?.currentLevel).toBe(muscleBmi?.currentLevel);
    expect(deriveTargetPriority("fat-loss", "body-composition")).toBe(1);
    expect(deriveTargetPriority("muscle-gain", "strength")).toBe(1);
    expect(fatLoss.domainPriorityOrder[0]).toBe("body-composition");
    expect(muscleGain.domainPriorityOrder[0]).toBe("strength");
  });

  it("is deterministic", () => {
    const baseline = buildHealthBaseline(fullBaselineInput());
    const input = { baseline, currentStateProfile: null, sex: "male" as const };
    expect(buildTargetStateRoadmap(input)).toEqual(buildTargetStateRoadmap(input));
  });
});

describe("deriveNextLevel", () => {
  it("returns next level or null at optimal", () => {
    expect(deriveNextLevel(2)).toBe(3);
    expect(deriveNextLevel(5)).toBeNull();
  });
});

describe("deriveMilestonesForMetric", () => {
  it("does not fabricate progression for unavailable metrics", () => {
    const milestones = deriveMilestonesForMetric({
      definition: BMI_METRIC,
      dataStatus: "unavailable",
      currentLevel: null,
      nextLevel: null,
      nextClassification: null,
      optimalClassification: "Optimal",
    });
    expect(milestones.every((m) => m.description.includes("Establish measurable baseline"))).toBe(
      true,
    );
  });
});
