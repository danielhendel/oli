// services/functions/src/healthSignals/computeHealthSignalsV1.ts
// Phase 1.5 Sprint 4 — pure, deterministic signal compute (threshold-based)

import type { YmdDateString, IsoDateTimeString } from "../types/health";
import { BASELINE_WINDOW_DAYS, REQUIRED_DOMAINS, type RequiredDomain } from "./constants";

/** Minimal HealthScore doc shape needed for signal compute (read from store). */
export interface HealthScoreDocForSignals {
  date: YmdDateString;
  compositeScore: number;
  domainScores: {
    recovery: { score: number };
    training: { score: number };
    nutrition: { score: number };
    body: { score: number };
  };
}

export interface ComputeHealthSignalsInput {
  dayKey: YmdDateString;
  healthScoreForDay: HealthScoreDocForSignals | null;
  healthScoreHistory: HealthScoreDocForSignals[];
  computedAt: IsoDateTimeString;
  pipelineVersion: number;
  thresholds: {
    compositeAttentionLt: number;
    domainAttentionLt: number;
    deviationAttentionPctLt: number;
  };
}

export type HealthSignalStatus = "stable" | "attention_required";
export type HealthSignalReadiness = "missing" | "partial" | "ready" | "error";

export interface HealthSignalDocResult {
  schemaVersion: 1;
  modelVersion: "1.0";
  date: YmdDateString;
  status: HealthSignalStatus;
  readiness: HealthSignalReadiness;
  computedAt: IsoDateTimeString;
  pipelineVersion: number;
  inputs: {
    healthScoreDayKey: YmdDateString;
    baselineWindowDays: number;
    baselineDaysPresent: number;
    thresholds: {
      compositeAttentionLt: number;
      domainAttentionLt: number;
      deviationAttentionPctLt: number;
    };
  };
  reasons: string[];
  missingInputs: string[];
  domainEvidence: Record<
    RequiredDomain,
    { score: number; baselineMean: number; deviationPct: number | null }
  >;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Deterministic, threshold-based health signals.
 * Missing inputs → fail-closed: status attention_required with explicit missingInputs.
 */
export function computeHealthSignalsV1(
  input: ComputeHealthSignalsInput,
): HealthSignalDocResult {
  const {
    dayKey,
    healthScoreForDay,
    healthScoreHistory,
    computedAt,
    pipelineVersion,
    thresholds,
  } = input;

  const reasons: string[] = [];
  const missingInputs: string[] = [];

  if (!healthScoreForDay) {
    missingInputs.push("health_score");
    const domainEvidence = Object.fromEntries(
      REQUIRED_DOMAINS.map((d) => [
        d,
        { score: 0, baselineMean: 0, deviationPct: null as number | null },
      ]),
    ) as HealthSignalDocResult["domainEvidence"];
    return {
      schemaVersion: 1,
      modelVersion: "1.0",
      date: dayKey,
      status: "attention_required",
      readiness: "missing",
      computedAt,
      pipelineVersion,
      inputs: {
        healthScoreDayKey: dayKey,
        baselineWindowDays: BASELINE_WINDOW_DAYS,
        baselineDaysPresent: healthScoreHistory.length,
        thresholds,
      },
      reasons: ["missing_health_score"],
      missingInputs,
      domainEvidence,
    };
  }

  const today = healthScoreForDay;
  const baselineDaysPresent = healthScoreHistory.length;

  const compositeBaselineMean =
    baselineDaysPresent > 0
      ? mean(healthScoreHistory.map((h) => h.compositeScore))
      : 0;
  const domainBaselineMeans: Record<RequiredDomain, number> = {
    recovery:
      baselineDaysPresent > 0
        ? mean(healthScoreHistory.map((h) => h.domainScores.recovery.score))
        : 0,
    training:
      baselineDaysPresent > 0
        ? mean(healthScoreHistory.map((h) => h.domainScores.training.score))
        : 0,
    nutrition:
      baselineDaysPresent > 0
        ? mean(healthScoreHistory.map((h) => h.domainScores.nutrition.score))
        : 0,
    body:
      baselineDaysPresent > 0
        ? mean(healthScoreHistory.map((h) => h.domainScores.body.score))
        : 0,
  };

  const domainEvidence = {} as HealthSignalDocResult["domainEvidence"];
  for (const domain of REQUIRED_DOMAINS) {
    const score = today.domainScores[domain].score;
    const baselineMean = domainBaselineMeans[domain];
    const deviationPct =
      baselineMean > 0 ? (score - baselineMean) / baselineMean : null;
    domainEvidence[domain] = { score, baselineMean, deviationPct };

    if (score < thresholds.domainAttentionLt) {
      reasons.push(`domain_${domain}_below_threshold`);
    }
    if (
      deviationPct !== null &&
      deviationPct < thresholds.deviationAttentionPctLt
    ) {
      reasons.push(`domain_${domain}_deviation_below_threshold`);
    }
  }

  if (today.compositeScore < thresholds.compositeAttentionLt) {
    reasons.push("composite_below_threshold");
  }
  const compositeDeviationPct =
    compositeBaselineMean > 0
      ? (today.compositeScore - compositeBaselineMean) / compositeBaselineMean
      : null;
  if (
    compositeDeviationPct !== null &&
    compositeDeviationPct < thresholds.deviationAttentionPctLt
  ) {
    reasons.push("composite_deviation_below_threshold");
  }

  const status: HealthSignalStatus =
    reasons.length > 0 ? "attention_required" : "stable";

  return {
    schemaVersion: 1,
    modelVersion: "1.0",
    date: dayKey,
    status,
    readiness: "ready",
    computedAt,
    pipelineVersion,
    inputs: {
      healthScoreDayKey: dayKey,
      baselineWindowDays: BASELINE_WINDOW_DAYS,
      baselineDaysPresent,
      thresholds,
    },
    reasons,
    missingInputs,
    domainEvidence,
  };
}
