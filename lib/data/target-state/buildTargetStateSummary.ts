// lib/data/target-state/buildTargetStateSummary.ts
import type { GoalType } from "@/lib/data/health-assessment/types";
import type { TargetStateRoadmap, TargetStateSummary } from "@/lib/data/target-state/types";

const DISCLAIMER =
  "Target states are evidence-based classification hypotheses — informational, non-diagnostic, and adjustable. They are not a health plan, prescription, or medical advice.";

function goalAlignmentCopy(primaryGoal: GoalType | null): string | null {
  if (primaryGoal == null) return null;
  const labels: Record<GoalType, string> = {
    "muscle-gain": "Roadmap prioritizes strength and body composition domains for muscle gain.",
    "fat-loss": "Roadmap prioritizes body composition, activity, and nutrition for fat loss.",
    "body-composition": "Roadmap prioritizes body composition and supporting domains.",
    performance: "Roadmap prioritizes strength, cardio, and activity for performance.",
    longevity: "Roadmap prioritizes labs, cardio, and long-term healthspan domains.",
    "general-health": "Roadmap prioritizes foundational health domains for general wellness.",
    rehabilitation: "Roadmap prioritizes recovery and safe progression domains.",
  };
  return labels[primaryGoal];
}

export function buildTargetStateSummary(roadmap: TargetStateRoadmap): TargetStateSummary {
  const allMetrics = roadmap.domains.flatMap((d) => d.metrics);

  const metricsWithMovementPotential = allMetrics
    .filter((m) => m.dataStatus === "available" && m.nextLevel != null)
    .map((m) => `Move ${m.label} from Level ${m.currentLevel} toward Level ${m.nextLevel}`);

  const metricsAtOptimal = allMetrics
    .filter((m) => m.dataStatus === "maintain-optimal")
    .map((m) => `Maintain Level 5 ${m.label} classification`);

  const metricsNeedingData = allMetrics
    .filter((m) => m.dataStatus === "unavailable")
    .map((m) => `Establish baseline for ${m.label}`);

  const headline =
    roadmap.domains.length === 0
      ? "Connect baseline data to generate your evidence-based target state roadmap."
      : metricsWithMovementPotential.length > 0
        ? "Your roadmap shows evidence-based classification progression from current levels toward optimal ranges."
        : metricsAtOptimal.length > 0
          ? "Your current classifications are at or near optimal — focus on maintaining evidence-based ranges."
          : "Your target state roadmap is forming as more baseline data becomes available.";

  return {
    headline,
    primaryGoalAlignment: goalAlignmentCopy(roadmap.primaryGoal),
    prioritizedDomainTitles: roadmap.domains
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .map((d) => d.title),
    metricsWithMovementPotential: metricsWithMovementPotential.slice(0, 6),
    metricsAtOptimal: metricsAtOptimal.slice(0, 6),
    metricsNeedingData: metricsNeedingData.slice(0, 6),
    targetStateConfidence: roadmap.targetStateConfidence,
    dataCoveragePercent: roadmap.dataCoveragePercent,
    disclaimer: DISCLAIMER,
  };
}
