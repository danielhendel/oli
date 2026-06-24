// lib/data/target-state/__tests__/buildTargetStateSummary.test.ts
import { buildHealthBaseline } from "@/lib/data/health-baseline/buildHealthBaseline";
import type { HealthBaselineInput } from "@/lib/data/health-baseline/healthBaselineInput";
import { buildTargetStateRoadmap } from "@/lib/data/target-state/buildTargetStateRoadmap";
import { buildTargetStateSummary } from "@/lib/data/target-state/buildTargetStateSummary";

function minimalBaselineInput(): HealthBaselineInput {
  return {
    todayDayKey: "2026-06-22",
    body: {
      weightKg: 80,
      bodyFatPercent: null,
      leanMassKg: null,
      bmi: 27,
      weightBaselineModel: null,
    },
    activity: { historyModel: null, activeMinutesToday: null },
    strength: { baselineModel: null },
    cardio: { baselineModel: null, restingHeartRateBpm: null, paceMinPerKm: null },
    nutrition: { baselineModel: null, macroTotals90d: null },
    recovery: { sleepBaselineVm: null, hrvRmssd: null, restingHeartRateBpm: null },
    labs: { summary: null },
  };
}

describe("buildTargetStateSummary", () => {
  it("includes disclaimer and confidence from roadmap", () => {
    const baseline = buildHealthBaseline(minimalBaselineInput());
    const roadmap = buildTargetStateRoadmap({
      baseline,
      currentStateProfile: { primaryGoal: "fat-loss" } as import("@/lib/data/health-assessment/types").CurrentStateProfile,
      sex: null,
    });
    const summary = buildTargetStateSummary(roadmap);
    expect(summary.disclaimer).toContain("not a health plan");
    expect(summary.targetStateConfidence).toBe(roadmap.targetStateConfidence);
    expect(summary.primaryGoalAlignment).toContain("fat loss");
  });

  it("is deterministic", () => {
    const baseline = buildHealthBaseline(minimalBaselineInput());
    const roadmap = buildTargetStateRoadmap({ baseline, currentStateProfile: null, sex: null });
    expect(buildTargetStateSummary(roadmap)).toEqual(buildTargetStateSummary(roadmap));
  });
});
