// lib/modules/commandCenterStrength.ts
import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";

export type ReadinessVocabularyState = Readiness;

export type StrengthSummaryUi = {
  workoutsCount: number;
  totalSets: number;
  totalReps: number;
  totalVolumeByUnit: {
    lb?: number;
    kg?: number;
  };
};

export type StrengthCommandCenterModel = {
  // Must use existing readiness vocabulary (Phase 1 invariant).
  state: ReadinessVocabularyState;
  title: string;
  description: string;
  summary: StrengthSummaryUi | null;
  showLogCta: boolean;
  showFailuresCta: boolean;
};

function fmtInt(n: number): string {
  return n.toLocaleString();
}

function fmtVolume(n: number): string {
  // Volume can be large; keep 0 decimals for readability.
  return Math.round(n).toLocaleString();
}

export function buildStrengthCommandCenterModel(args: {
  dataReadinessState: ReadinessVocabularyState;
  factsDoc: DailyFactsDto | null;
  hasFailures: boolean;
}): StrengthCommandCenterModel {
  const { dataReadinessState, factsDoc, hasFailures } = args;

  if (dataReadinessState === "error") {
    return {
      state: "error",
      title: "Strength",
      description:
        "Your derived truth is currently invalid (pipeline error). Fix upstream issues or review failures to understand why strength cannot be computed.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "missing") {
    return {
      state: "missing",
      title: "Strength",
      description: "No events yet today — log a strength workout to generate today’s strength summary.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "partial") {
    return {
      state: "partial",
      title: "Strength",
      description:
        "Your derived truth is still building (partial). Some derived data for today may be missing until the pipeline catches up.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  // dataReadinessState === "ready"
  const strength = factsDoc?.strength;

  // Important: do not silently display zeros when the section is missing.
  if (!strength) {
    return {
      state: "partial",
      title: "Strength",
      description:
        "Derived truth is ready, but today’s strength summary is missing from DailyFacts. This usually means no strength events were processed or the mapping is incomplete.",
      summary: null,
      showLogCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const summary: StrengthSummaryUi = {
    workoutsCount: strength.workoutsCount,
    totalSets: strength.totalSets,
    totalReps: strength.totalReps,
    totalVolumeByUnit: {
      ...(typeof strength.totalVolumeByUnit.lb === "number" ? { lb: strength.totalVolumeByUnit.lb } : {}),
      ...(typeof strength.totalVolumeByUnit.kg === "number" ? { kg: strength.totalVolumeByUnit.kg } : {}),
    },
  };

  const noWorkouts = strength.workoutsCount === 0;

  const volumeParts: string[] = [];
  if (typeof strength.totalVolumeByUnit.lb === "number") volumeParts.push(`${fmtVolume(strength.totalVolumeByUnit.lb)} lb`);
  if (typeof strength.totalVolumeByUnit.kg === "number") volumeParts.push(`${fmtVolume(strength.totalVolumeByUnit.kg)} kg`);

  const volumeText = volumeParts.length ? volumeParts.join(" / ") : "—";

  const description = noWorkouts
    ? "No strength workouts logged today. Log one to start building your strength summary."
    : `Today: ${fmtInt(strength.workoutsCount)} workout(s) • ${fmtInt(strength.totalSets)} sets • ${fmtInt(
        strength.totalReps,
      )} reps • Volume ${volumeText}`;

  return {
    state: "ready",
    title: "Strength",
    description,
    summary,
    showLogCta: noWorkouts,
    showFailuresCta: hasFailures,
  };
}
