// services/functions/src/dailyFacts/selectBodyFactsForDay.ts

/**
 * Source-aware selection of body facts for a single day.
 * Slice 2 metricSources keys include:
 * - weight
 * - body_fat_percent
 * - bmi
 * - lean_body_mass
 * - resting_metabolic_rate
 * determine which raw event is used when multiple exist for the same day.
 *
 * - One source wins per metric per day (no merging/averaging).
 * - Fallback: latest by observedAt when no preferred source or no matching event.
 */

import { isAppleHealthBodyReadSourceId } from "@oli/contracts";

import type { DailyBodyFacts } from "../types/health";

/** Metric IDs used in preferences.metricSources (repo truth). */
export const BODY_METRIC_WEIGHT = "weight";
export const BODY_METRIC_BODY_FAT_PERCENT = "body_fat_percent";
export const BODY_METRIC_BMI = "bmi";
export const BODY_METRIC_LEAN_BODY_MASS = "lean_body_mass";
export const BODY_METRIC_RESTING_METABOLIC_RATE = "resting_metabolic_rate";

/** One body-capable raw event (weight and/or body fat) for a day. */
export interface BodyRawEventForDay {
  observedAt: string;
  sourceId: string;
  weightKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  leanBodyMassKg?: number;
  restingMetabolicRateKcal?: number;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isValidWeight = (v: number): boolean => v > 0;
const isValidBodyFat = (v: number): boolean => v >= 0 && v <= 100;
const isValidBmi = (v: number): boolean => v > 0 && v < 100;
const isValidLeanBodyMassKg = (v: number): boolean => v > 0;
const isValidRestingMetabolicRateKcal = (v: number): boolean => v > 0;
const APPLE_HEALTH_SOURCE_ALIASES = new Set(["apple_health", "healthkit"]);

function sourceMatchesPreferred(sourceId: string, preferredSourceId: string): boolean {
  if (preferredSourceId === "apple_health") return APPLE_HEALTH_SOURCE_ALIASES.has(sourceId);
  return sourceId === preferredSourceId;
}

/**
 * Select a single event for a metric: preferred source latest by observedAt, else latest overall.
 */
function selectEventForMetric(
  events: BodyRawEventForDay[],
  preferredSourceId: string | undefined,
  hasValue: (e: BodyRawEventForDay) => boolean,
): BodyRawEventForDay | undefined {
  const withValue = events.filter(hasValue);
  if (withValue.length === 0) return undefined;

  const fromPreferred =
    preferredSourceId &&
    withValue.filter((e) => sourceMatchesPreferred(e.sourceId, preferredSourceId));
  const pool =
    fromPreferred && fromPreferred.length > 0 ? fromPreferred : withValue;
  pool.sort((a, b) => (a.observedAt < b.observedAt ? 1 : a.observedAt > b.observedAt ? -1 : 0));
  return pool[0];
}

/**
 * Deterministic, pure: from body-capable raw events and metric source preferences,
 * produce the DailyBodyFacts for the day (one source per metric; fallback latest by observedAt).
 */
export function selectBodyFactsForDay(
  bodyRawEvents: BodyRawEventForDay[],
  metricSources: Record<string, string> | undefined,
): DailyBodyFacts | undefined {
  const eligible = bodyRawEvents.filter((e) => isAppleHealthBodyReadSourceId(e.sourceId));
  if (eligible.length === 0) return undefined;

  const weightEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_WEIGHT],
    (e) => isFiniteNumber(e.weightKg) && isValidWeight(e.weightKg),
  );
  const bodyFatEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_BODY_FAT_PERCENT],
    (e) => isFiniteNumber(e.bodyFatPercent) && isValidBodyFat(e.bodyFatPercent),
  );
  const bmiEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_BMI],
    (e) => isFiniteNumber(e.bmi) && isValidBmi(e.bmi),
  );
  const leanBodyMassEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_LEAN_BODY_MASS],
    (e) => isFiniteNumber(e.leanBodyMassKg) && isValidLeanBodyMassKg(e.leanBodyMassKg),
  );
  const restingMetabolicRateEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_RESTING_METABOLIC_RATE],
    (e) =>
      isFiniteNumber(e.restingMetabolicRateKcal) &&
      isValidRestingMetabolicRateKcal(e.restingMetabolicRateKcal),
  );

  const weightKg = weightEvent?.weightKg;
  const bodyFatPercent = bodyFatEvent?.bodyFatPercent;
  const bmi = bmiEvent?.bmi;
  const leanBodyMassKg = leanBodyMassEvent?.leanBodyMassKg;
  const restingMetabolicRateKcal = restingMetabolicRateEvent?.restingMetabolicRateKcal;

  if (
    weightKg === undefined &&
    bodyFatPercent === undefined &&
    bmi === undefined &&
    leanBodyMassKg === undefined &&
    restingMetabolicRateKcal === undefined
  )
    return undefined;

  const facts: DailyBodyFacts = {};
  if (weightKg !== undefined) facts.weightKg = weightKg;
  if (bodyFatPercent !== undefined) facts.bodyFatPercent = bodyFatPercent;
  if (bmi !== undefined) facts.bmi = bmi;
  if (leanBodyMassKg !== undefined) facts.leanBodyMassKg = leanBodyMassKg;
  if (restingMetabolicRateKcal !== undefined) facts.restingMetabolicRateKcal = restingMetabolicRateKcal;
  return facts;
}
