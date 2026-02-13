// services/functions/src/healthScore/computeHealthScoreV1.ts
// Phase 1.5 Sprint 1 — Health Score Model v1.0 (pure, deterministic)

import type { DailyFacts, IsoDateTimeString, YmdDateString } from "../types/health";

export type HealthScoreTier = "excellent" | "good" | "fair" | "poor";
export type HealthScoreStatus = "stable" | "attention_required" | "insufficient_data";

export interface DomainScoreResult {
  score: number;
  tier: HealthScoreTier;
  missing: string[];
}

export interface HealthScoreInput {
  userId: string;
  date: YmdDateString;
  today: DailyFacts;
  history: DailyFacts[];
  computedAt: IsoDateTimeString;
  pipelineVersion: number;
}

export interface HealthScoreResult {
  schemaVersion: 1;
  modelVersion: "1.0";
  date: YmdDateString;
  compositeScore: number;
  compositeTier: HealthScoreTier;
  domainScores: {
    recovery: DomainScoreResult;
    training: DomainScoreResult;
    nutrition: DomainScoreResult;
    body: DomainScoreResult;
  };
  status: HealthScoreStatus;
  computedAt: IsoDateTimeString;
  pipelineVersion: number;
  inputs: {
    hasDailyFacts: boolean;
    historyDaysUsed: number;
  };
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function scoreToTier(score: number): HealthScoreTier {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function clamp0_100(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/**
 * Recovery domain: readiness (0–100) or HRV RMSSD (10–120 ms → 0–100).
 * Deterministic, no interpretation layer.
 */
function recoveryDomain(today: DailyFacts): DomainScoreResult {
  const r = today.recovery;
  const missing: string[] = [];

  if (isFiniteNumber(r?.readinessScore)) {
    const score = clamp0_100(r!.readinessScore!);
    return { score, tier: scoreToTier(score), missing };
  }
  if (isFiniteNumber(r?.hrvRmssd)) {
    // 10–120 ms → 0–100 linear (conservative band)
    const score = clamp0_100(((r!.hrvRmssd! - 10) / 110) * 100);
    return { score, tier: scoreToTier(score), missing };
  }
  if (r) missing.push("readiness", "hrv");
  else missing.push("recovery_data");
  return { score: 0, tier: "poor", missing };
}

/**
 * Training domain: steps (0–12k → 0–100) or training load (0–400 → 0–100) or move (0–60 min → 0–100).
 * Take best available signal; deterministic.
 */
function trainingDomain(today: DailyFacts): DomainScoreResult {
  const a = today.activity;
  const missing: string[] = [];
  let score = 0;

  if (isFiniteNumber(a?.steps)) {
    score = Math.max(score, clamp0_100((a!.steps! / 12000) * 100));
  } else missing.push("steps");
  if (isFiniteNumber(a?.trainingLoad)) {
    score = Math.max(score, clamp0_100((a!.trainingLoad! / 400) * 100));
  } else missing.push("training_load");
  if (isFiniteNumber(a?.moveMinutes)) {
    score = Math.max(score, clamp0_100((a!.moveMinutes! / 60) * 100));
  } else if (!missing.includes("steps") && !missing.includes("training_load")) missing.push("move_minutes");

  if (score === 0 && today.strength && today.strength.totalSets > 0) {
    score = 50; // strength-only day: fixed 50
    return { score, tier: scoreToTier(score), missing: [] };
  }
  if (score === 0) missing.push("activity_data");
  return { score, tier: scoreToTier(score), missing };
}

/**
 * Nutrition domain: completeness of macro data (0–4 fields → 0–100).
 */
function nutritionDomain(today: DailyFacts): DomainScoreResult {
  const n = today.nutrition;
  const missing: string[] = [];
  let count = 0;
  if (isFiniteNumber(n?.totalKcal)) count++;
  else missing.push("total_kcal");
  if (isFiniteNumber(n?.proteinG)) count++;
  else missing.push("protein_g");
  if (isFiniteNumber(n?.carbsG)) count++;
  else missing.push("carbs_g");
  if (isFiniteNumber(n?.fatG)) count++;
  else missing.push("fat_g");
  const score = count === 0 ? 0 : clamp0_100((count / 4) * 100);
  if (count === 0) missing.push("nutrition_data");
  return { score, tier: scoreToTier(score), missing };
}

/**
 * Body domain: presence of weight or body composition.
 */
function bodyDomain(today: DailyFacts): DomainScoreResult {
  const b = today.body;
  const missing: string[] = [];
  if (isFiniteNumber(b?.weightKg) || isFiniteNumber(b?.bodyFatPercent)) {
    return { score: 100, tier: "excellent", missing };
  }
  missing.push("weight");
  return { score: 0, tier: "poor", missing };
}

/**
 * Composite = average of four domain scores (equal weight).
 * Status: insufficient_data when no daily facts; attention_required when fair/poor; else stable.
 */
export function computeHealthScoreV1(input: HealthScoreInput): HealthScoreResult {
  const { date, today, history, computedAt, pipelineVersion } = input;

  const recovery = recoveryDomain(today);
  const training = trainingDomain(today);
  const nutrition = nutritionDomain(today);
  const body = bodyDomain(today);

  const compositeScore = Math.round(
    (recovery.score + training.score + nutrition.score + body.score) / 4,
  );
  const compositeTier = scoreToTier(compositeScore);

  let status: HealthScoreStatus = "stable";
  if (compositeTier === "poor" || compositeTier === "fair") status = "attention_required";
  const hasAnyData =
    recovery.score > 0 ||
    training.score > 0 ||
    nutrition.score > 0 ||
    body.score > 0;
  if (!hasAnyData) status = "insufficient_data";

  return {
    schemaVersion: 1,
    modelVersion: "1.0",
    date,
    compositeScore,
    compositeTier,
    domainScores: { recovery, training, nutrition, body },
    status,
    computedAt,
    pipelineVersion,
    inputs: {
      hasDailyFacts: true,
      historyDaysUsed: history.length,
    },
  };
}
