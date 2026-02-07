// lib/modules/commandCenterRecovery.ts
import type { DailyFactsDto } from "../contracts/dailyFacts";

export type ReadinessVocabularyState = "loading" | "empty" | "invalid" | "partial" | "ready";

export type RecoverySummaryUi = {
  hrvRmssd?: number;
  hrvRmssdBaseline?: number;
  hrvRmssdDeviation?: number;
};

export type RecoveryCommandCenterModel = {
  state: ReadinessVocabularyState;
  title: string;
  description: string;
  summary: RecoverySummaryUi | null;
  showReadinessCta: boolean;
  showFailuresCta: boolean;
};

/**
 * Format deviation with sign (+/-) and one decimal place.
 * Never returns "0" for missing data; caller must handle undefined.
 */
function formatDeviation(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

export function buildRecoveryCommandCenterModel(args: {
  dataReadinessState: ReadinessVocabularyState;
  factsDoc: DailyFactsDto | null;
  hasFailures: boolean;
}): RecoveryCommandCenterModel {
  const { dataReadinessState, factsDoc, hasFailures } = args;

  if (dataReadinessState === "loading") {
    return {
      state: "loading",
      title: "Recovery",
      description: "Loading derived recovery summary…",
      summary: null,
      showReadinessCta: false,
      showFailuresCta: false,
    };
  }

  if (dataReadinessState === "invalid") {
    return {
      state: "invalid",
      title: "Recovery",
      description:
        "Your derived truth is currently invalid (pipeline error). Fix upstream issues or review failures to understand why recovery cannot be computed.",
      summary: null,
      showReadinessCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "empty") {
    return {
      state: "empty",
      title: "Recovery",
      description: "No events yet today — check readiness to see recovery status when data is available.",
      summary: null,
      showReadinessCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "partial") {
    return {
      state: "partial",
      title: "Recovery",
      description:
        "Your derived truth is still building (partial). Some derived data for today may be missing until the pipeline catches up.",
      summary: null,
      showReadinessCta: true,
      showFailuresCta: hasFailures,
    };
  }

  // dataReadinessState === "ready"
  const recovery = factsDoc?.recovery;

  // Fail closed: readiness ready but recovery missing
  if (!recovery) {
    return {
      state: "partial",
      title: "Recovery",
      description:
        "Derived truth is ready, but today's recovery summary is missing from DailyFacts. This usually means no HRV/recovery events were processed or the mapping is incomplete.",
      summary: null,
      showReadinessCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const hasHrvRmssd = typeof recovery.hrvRmssd === "number";
  const hasBaseline = typeof recovery.hrvRmssdBaseline === "number";
  const hasDeviation = typeof recovery.hrvRmssdDeviation === "number";

  const hasAnyMetric = hasHrvRmssd || hasBaseline || hasDeviation;

  if (!hasAnyMetric) {
    return {
      state: "partial",
      title: "Recovery",
      description:
        "Recovery data exists but has no HRV metrics (RMSSD, baseline, or deviation). Check readiness to see when recovery data is available.",
      summary: null,
      showReadinessCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const summary: RecoverySummaryUi = {};
  const hrvVal = recovery.hrvRmssd;
  const baselineVal = recovery.hrvRmssdBaseline;
  const deviationVal = recovery.hrvRmssdDeviation;

  if (typeof hrvVal === "number") summary.hrvRmssd = hrvVal;
  if (typeof baselineVal === "number") summary.hrvRmssdBaseline = baselineVal;
  if (typeof deviationVal === "number") summary.hrvRmssdDeviation = deviationVal;

  const parts: string[] = [];
  if (typeof hrvVal === "number") parts.push(`HRV ${hrvVal.toFixed(1)}`);
  if (typeof baselineVal === "number") parts.push(`Baseline ${baselineVal.toFixed(1)}`);
  if (typeof deviationVal === "number") parts.push(`Δ ${formatDeviation(deviationVal)}`);

  const description = parts.length ? `Today: ${parts.join(" • ")}` : "No recovery metrics yet.";

  return {
    state: "ready",
    title: "Recovery",
    description,
    summary,
    showReadinessCta: false,
    showFailuresCta: hasFailures,
  };
}
