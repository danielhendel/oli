// services/functions/src/dailyFacts/enrichDailyFacts.ts

import type { DailyFacts } from '../types/health';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const average = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
};

export interface EnrichDailyFactsInput {
  /**
   * The DailyFacts object computed for the current target date.
   * This is the document we will enrich with baselines and rolling averages.
   */
  today: DailyFacts;
  /**
   * Previous DailyFacts documents for this user, sorted or unsorted.
   * Caller should ensure these represent recent days (e.g. up to the last 6 days).
   */
  history: DailyFacts[];
}

/**
 * Enrich a DailyFacts document with:
 * - 7-day rolling averages for steps and trainingLoad
 * - HRV baseline and relative deviation
 * - Domain-level confidence scores (0–1) based on 7-day coverage
 *
 * This function is:
 * - Pure and deterministic given (today, history)
 * - Safe to call multiple times (idempotent; it overwrites derived fields)
 */
export const enrichDailyFactsWithBaselinesAndAverages = (
  input: EnrichDailyFactsInput,
): DailyFacts => {
  const { today, history } = input;

  // Start with a shallow copy of today's DailyFacts.
  const enriched: DailyFacts = { ...today };

  // Clone nested objects only when they exist, to avoid mutating the original.
  if (today.sleep) {
    enriched.sleep = { ...today.sleep };
  }

  if (today.activity) {
    enriched.activity = { ...today.activity };
  }

  if (today.recovery) {
    enriched.recovery = { ...today.recovery };
  }

  if (today.body) {
    enriched.body = { ...today.body };
  }

  if (today.confidence) {
    enriched.confidence = { ...today.confidence };
  }

  // ------- 7-day rolling averages for steps & training load -------
  //
  // We only compute rolling averages when we have at least ONE prior day
  // of history. Otherwise, we leave these derived fields undefined to
  // avoid pretending we have a "trend" with just a single day.

  const activityWindow =
    history.length > 0
      ? [...history, today]
      : [];

  const stepsValues = activityWindow
    .map((facts) => facts.activity?.steps)
    .filter(isNumber);

  const trainingLoadValues = activityWindow
    .map((facts) => facts.activity?.trainingLoad)
    .filter(isNumber);

  if (stepsValues.length > 0) {
    if (!enriched.activity) enriched.activity = {};
    const avgSteps = average(stepsValues);
    if (avgSteps !== undefined) {
      enriched.activity.stepsAvg7d = avgSteps;
    }
  }

  if (trainingLoadValues.length > 0) {
    if (!enriched.activity) enriched.activity = {};
    const avgTrainingLoad = average(trainingLoadValues);
    if (avgTrainingLoad !== undefined) {
      enriched.activity.trainingLoadAvg7d = avgTrainingLoad;
    }
  }

  // ------- HRV baseline + deviation -------
  //
  // Baseline is computed from history only (previous days),
  // so today's HRV can be compared against a prior norm.

  const hrvHistoryValues = history
    .map((facts) => facts.recovery?.hrvRmssd)
    .filter(isNumber);

  const baseline = average(hrvHistoryValues);

  if (baseline !== undefined) {
    if (!enriched.recovery) enriched.recovery = {};
    enriched.recovery.hrvRmssdBaseline = baseline;

    const todayHrv = enriched.recovery.hrvRmssd;
    if (isNumber(todayHrv) && baseline !== 0) {
      const deviation = (todayHrv - baseline) / baseline;
      enriched.recovery.hrvRmssdDeviation = deviation;
    }
  }

  // ------- Domain-level confidence (0–1) -------
  //
  // We approximate coverage over a 7-day window:
  // - Window is the target day + last 6 days (if present in history).
  // - For each domain, confidence = (# of days with that domain) / 7.
  // - If no days have data for a domain, we leave that confidence undefined.

  const windowFacts: DailyFacts[] = [...history, today];
  const windowSize = 7;

  const computeDomainCoverage = (selector: (facts: DailyFacts) => unknown): number | undefined => {
    if (windowFacts.length === 0) {
      return undefined;
    }

    const presentCount = windowFacts.reduce((count, facts) => {
      const value = selector(facts);
      return value ? count + 1 : count;
    }, 0);

    if (presentCount === 0) {
      return undefined;
    }

    const score = presentCount / windowSize;
    return score > 1 ? 1 : score;
  };

  const sleepConfidence = computeDomainCoverage((f) => f.sleep);
  const activityConfidence = computeDomainCoverage((f) => f.activity);
  const recoveryConfidence = computeDomainCoverage((f) => f.recovery);
  const bodyConfidence = computeDomainCoverage((f) => f.body);

  if (
    sleepConfidence !== undefined ||
    activityConfidence !== undefined ||
    recoveryConfidence !== undefined ||
    bodyConfidence !== undefined
  ) {
    if (!enriched.confidence) {
      enriched.confidence = {};
    }

    if (sleepConfidence !== undefined) {
      enriched.confidence.sleep = sleepConfidence;
    }

    if (activityConfidence !== undefined) {
      enriched.confidence.activity = activityConfidence;
    }

    if (recoveryConfidence !== undefined) {
      enriched.confidence.recovery = recoveryConfidence;
    }

    if (bodyConfidence !== undefined) {
      enriched.confidence.body = bodyConfidence;
    }
  }

  return enriched;
};
