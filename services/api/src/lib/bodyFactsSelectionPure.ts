/**
 * Pure body metric selection (matches Functions selectBodyFactsForDay). No Firestore.
 */

import { isAppleHealthBodyReadSourceId } from "@oli/contracts/bodyReadSources";

export type DailyBodyFactsSynthesized = {
  weightKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  leanBodyMassKg?: number;
  restingMetabolicRateKcal?: number;
};

export type BodyRawEventForDay = {
  observedAt: string;
  sourceId: string;
  weightKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  leanBodyMassKg?: number;
  restingMetabolicRateKcal?: number;
};

const BODY_METRIC_WEIGHT = "weight";
const BODY_METRIC_BODY_FAT_PERCENT = "body_fat_percent";
const BODY_METRIC_BMI = "bmi";
const BODY_METRIC_LEAN_BODY_MASS = "lean_body_mass";
const BODY_METRIC_RESTING_METABOLIC_RATE = "resting_metabolic_rate";

const APPLE_HEALTH_SOURCE_ALIASES = new Set(["apple_health", "healthkit"]);

function sourceMatchesPreferred(sourceId: string, preferredSourceId: string): boolean {
  if (preferredSourceId === "apple_health") return APPLE_HEALTH_SOURCE_ALIASES.has(sourceId);
  return sourceId === preferredSourceId;
}

function selectEventForMetric(
  events: BodyRawEventForDay[],
  preferredSourceId: string | undefined,
  hasValue: (e: BodyRawEventForDay) => boolean,
): BodyRawEventForDay | undefined {
  const withValue = events.filter(hasValue);
  if (withValue.length === 0) return undefined;
  const fromPreferred =
    preferredSourceId && withValue.filter((e) => sourceMatchesPreferred(e.sourceId, preferredSourceId));
  const pool = fromPreferred && fromPreferred.length > 0 ? fromPreferred : withValue;
  pool.sort((a, b) => (a.observedAt < b.observedAt ? 1 : a.observedAt > b.observedAt ? -1 : 0));
  return pool[0];
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function selectBodyFactsForDayFromRaw(
  bodyRawEvents: BodyRawEventForDay[],
  metricSources: Record<string, string> | undefined,
): DailyBodyFactsSynthesized | undefined {
  const eligible = bodyRawEvents.filter((e) => isAppleHealthBodyReadSourceId(e.sourceId));
  if (eligible.length === 0) return undefined;

  const weightEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_WEIGHT],
    (e) => isFiniteNumber(e.weightKg) && e.weightKg > 0,
  );
  const bodyFatEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_BODY_FAT_PERCENT],
    (e) => isFiniteNumber(e.bodyFatPercent) && e.bodyFatPercent >= 0 && e.bodyFatPercent <= 100,
  );
  const bmiEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_BMI],
    (e) => isFiniteNumber(e.bmi) && e.bmi > 0 && e.bmi < 100,
  );
  const leanBodyMassEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_LEAN_BODY_MASS],
    (e) => isFiniteNumber(e.leanBodyMassKg) && e.leanBodyMassKg > 0,
  );
  const restingMetabolicRateEvent = selectEventForMetric(
    eligible,
    metricSources?.[BODY_METRIC_RESTING_METABOLIC_RATE],
    (e) => isFiniteNumber(e.restingMetabolicRateKcal) && e.restingMetabolicRateKcal > 0,
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

  const facts: DailyBodyFactsSynthesized = {};
  if (weightKg !== undefined) facts.weightKg = weightKg;
  if (bodyFatPercent !== undefined) facts.bodyFatPercent = bodyFatPercent;
  if (bmi !== undefined) facts.bmi = bmi;
  if (leanBodyMassKg !== undefined) facts.leanBodyMassKg = leanBodyMassKg;
  if (restingMetabolicRateKcal !== undefined) facts.restingMetabolicRateKcal = restingMetabolicRateKcal;
  return facts;
}
