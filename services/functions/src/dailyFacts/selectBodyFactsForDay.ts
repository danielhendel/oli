// services/functions/src/dailyFacts/selectBodyFactsForDay.ts

/**
 * Source-aware selection of body facts (weight, body fat) for a single day.
 * Slice 2: preferences.metricSources.weight and preferences.metricSources.body_fat_percent
 * determine which raw event is used when multiple exist for the same day.
 *
 * - One source wins per metric per day (no merging/averaging).
 * - Fallback: latest by observedAt when no preferred source or no matching event.
 */

import type { DailyBodyFacts } from "../types/health";

/** Metric IDs used in preferences.metricSources (repo truth). */
export const BODY_METRIC_WEIGHT = "weight";
export const BODY_METRIC_BODY_FAT_PERCENT = "body_fat_percent";

/** One body-capable raw event (weight and/or body fat) for a day. */
export interface BodyRawEventForDay {
  observedAt: string;
  sourceId: string;
  weightKg?: number;
  bodyFatPercent?: number;
}

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isValidWeight = (v: number): boolean => v > 0;
const isValidBodyFat = (v: number): boolean => v >= 0 && v <= 100;

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
    withValue.filter((e) => e.sourceId === preferredSourceId);
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
  if (bodyRawEvents.length === 0) return undefined;

  const weightEvent = selectEventForMetric(
    bodyRawEvents,
    metricSources?.[BODY_METRIC_WEIGHT],
    (e) => isFiniteNumber(e.weightKg) && isValidWeight(e.weightKg),
  );
  const bodyFatEvent = selectEventForMetric(
    bodyRawEvents,
    metricSources?.[BODY_METRIC_BODY_FAT_PERCENT],
    (e) => isFiniteNumber(e.bodyFatPercent) && isValidBodyFat(e.bodyFatPercent),
  );

  const weightKg = weightEvent?.weightKg;
  const bodyFatPercent = bodyFatEvent?.bodyFatPercent;

  if (weightKg === undefined && bodyFatPercent === undefined) return undefined;

  const facts: DailyBodyFacts = {};
  if (weightKg !== undefined) facts.weightKg = weightKg;
  if (bodyFatPercent !== undefined) facts.bodyFatPercent = bodyFatPercent;
  return facts;
}
