// services/functions/src/dailyFacts/enrichDailyFacts.ts

import type {
  DailyFacts,
  DailyActivityFacts,
  DailyRecoveryFacts,
  DailyDomainConfidence,
} from '../types/health';

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
   * Previous DailyFacts documents for this user.
   * Caller should ensure these represent recent days (ideally up to the last 6 days).
   */
  history: DailyFacts[];
}

const hasAnyTruthyKey = (obj: Record<string, unknown> | undefined): boolean => {
  if (!obj) return false;
  return Object.values(obj).some((v) => v !== undefined && v !== null);
};

const activityHasSignal = (a: DailyActivityFacts | undefined): boolean => {
  if (!a) return false;
  return (
    isNumber(a.steps) ||
    isNumber(a.distanceKm) ||
    isNumber(a.moveMinutes) ||
    isNumber(a.trainingLoad)
  );
};

const recoveryHasSignal = (r: DailyRecoveryFacts | undefined): boolean => {
  if (!r) return false;
  return isNumber(r.hrvRmssd) || isNumber(r.restingHeartRate) || isNumber(r.readinessScore);
};

const clamp01 = (value: number): number => {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

/**
 * Enrich a DailyFacts document with:
 * - 7-day rolling averages for steps and trainingLoad
 * - HRV baseline and relative deviation
 * - Domain-level confidence scores (0–1) based on 7-day coverage
 *
 * Pure + deterministic. Idempotent (overwrites derived fields).
 */
export const enrichDailyFactsWithBaselinesAndAverages = (
  input: EnrichDailyFactsInput,
): DailyFacts => {
  const { today, history } = input;

  // Shallow copy. We only create nested objects if we need to write derived fields.
  const enriched: DailyFacts = { ...today };

  // ---------------------------------------------------------------------------
  // Rolling averages (requires at least 1 prior day)
  // ---------------------------------------------------------------------------

  const hasPrior = history.length > 0;
  if (hasPrior) {
    const windowFacts: DailyFacts[] = [...history, today];

    const stepsValues = windowFacts
      .map((f) => f.activity?.steps)
      .filter(isNumber);

    const trainingLoadValues = windowFacts
      .map((f) => f.activity?.trainingLoad)
      .filter(isNumber);

    const avgSteps = average(stepsValues);
    const avgTrainingLoad = average(trainingLoadValues);

    if (avgSteps !== undefined || avgTrainingLoad !== undefined) {
      const baseActivity: DailyActivityFacts | undefined = enriched.activity
        ? { ...enriched.activity }
        : undefined;

      const nextActivity: DailyActivityFacts = baseActivity ?? {};

      if (avgSteps !== undefined) nextActivity.stepsAvg7d = avgSteps;
      if (avgTrainingLoad !== undefined) nextActivity.trainingLoadAvg7d = avgTrainingLoad;

      enriched.activity = nextActivity;
    }
  }

  // ---------------------------------------------------------------------------
  // HRV baseline + deviation (baseline from history only)
  // ---------------------------------------------------------------------------

  const hrvHistoryValues = history
    .map((f) => f.recovery?.hrvRmssd)
    .filter(isNumber);

  const baseline = average(hrvHistoryValues);

  if (baseline !== undefined) {
    const baseRecovery: DailyRecoveryFacts | undefined = enriched.recovery
      ? { ...enriched.recovery }
      : undefined;

    const nextRecovery: DailyRecoveryFacts = baseRecovery ?? {};

    nextRecovery.hrvRmssdBaseline = baseline;

    const todayHrv = nextRecovery.hrvRmssd;
    if (isNumber(todayHrv) && baseline !== 0) {
      nextRecovery.hrvRmssdDeviation = (todayHrv - baseline) / baseline;
    }

    enriched.recovery = nextRecovery;
  }

  // ---------------------------------------------------------------------------
  // Domain-level confidence (0–1)
  // - Coverage is measured over a FIXED 7-day window (Sprint 5 semantics)
  // - Missing days count as "no data" (so divisor stays 7)
  // - Presence is based on meaningful signal, not just object existence
  // ---------------------------------------------------------------------------

  const windowSize = 7;
  const window = [...history, today].slice(-windowSize);

  const computeCoverage = (isPresent: (f: DailyFacts) => boolean): number | undefined => {
    if (window.length === 0) return undefined;

    const present = window.reduce((count, f) => (isPresent(f) ? count + 1 : count), 0);
    if (present === 0) return undefined;

    return clamp01(present / windowSize);
  };

  const sleepConfidence = computeCoverage((f) =>
    hasAnyTruthyKey(f.sleep as unknown as Record<string, unknown> | undefined),
  );
  const activityConfidence = computeCoverage((f) => activityHasSignal(f.activity));
  const recoveryConfidence = computeCoverage((f) => recoveryHasSignal(f.recovery));
  const bodyConfidence = computeCoverage((f) =>
    hasAnyTruthyKey(f.body as unknown as Record<string, unknown> | undefined),
  );

  if (
    sleepConfidence !== undefined ||
    activityConfidence !== undefined ||
    recoveryConfidence !== undefined ||
    bodyConfidence !== undefined
  ) {
    const baseConfidence: DailyDomainConfidence | undefined = enriched.confidence
      ? { ...enriched.confidence }
      : undefined;

    const nextConfidence: DailyDomainConfidence = baseConfidence ?? {};

    if (sleepConfidence !== undefined) nextConfidence.sleep = sleepConfidence;
    if (activityConfidence !== undefined) nextConfidence.activity = activityConfidence;
    if (recoveryConfidence !== undefined) nextConfidence.recovery = recoveryConfidence;
    if (bodyConfidence !== undefined) nextConfidence.body = bodyConfidence;

    enriched.confidence = nextConfidence;
  }

  return enriched;
};
