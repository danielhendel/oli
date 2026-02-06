// services/functions/src/dailyFacts/aggregateDailyFacts.ts

import type {
  CanonicalEvent,
  DailyFacts,
  DailyActivityFacts,
  DailyBodyFacts,
  DailyRecoveryFacts,
  DailySleepFacts,
  DailyStrengthFacts,
  IsoDateTimeString,
  YmdDateString,
  SleepCanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  WeightCanonicalEvent,
  HrvCanonicalEvent,
  StrengthWorkoutCanonicalEvent,
} from '../types/health';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const average = (values: number[]): number | undefined => {
  if (values.length === 0) return undefined;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
};

// -----------------------------------------------------------------------------
// Kind filters (keeps downstream code fully typed)
// -----------------------------------------------------------------------------

const isSleepEvent = (e: CanonicalEvent): e is SleepCanonicalEvent => e.kind === 'sleep';
const isStepsEvent = (e: CanonicalEvent): e is StepsCanonicalEvent => e.kind === 'steps';
const isWorkoutEvent = (e: CanonicalEvent): e is WorkoutCanonicalEvent => e.kind === 'workout';
const isWeightEvent = (e: CanonicalEvent): e is WeightCanonicalEvent => e.kind === 'weight';
const isHrvEvent = (e: CanonicalEvent): e is HrvCanonicalEvent => e.kind === 'hrv';
const isStrengthWorkoutEvent = (
  e: CanonicalEvent,
): e is StrengthWorkoutCanonicalEvent => e.kind === 'strength_workout';

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

const buildSleepFacts = (events: CanonicalEvent[]): DailySleepFacts | undefined => {
  const sleepEvents = events.filter(isSleepEvent);
  if (sleepEvents.length === 0) return undefined;

  const facts: DailySleepFacts = {};

  const totalMinutes = sleepEvents.reduce((sum, e) => sum + e.totalMinutes, 0);
  if (totalMinutes > 0) {
    facts.totalMinutes = totalMinutes;
  }

  const mainSleepMinutes = sleepEvents.reduce(
    (sum, e) => (e.isMainSleep ? sum + e.totalMinutes : sum),
    0,
  );
  if (mainSleepMinutes > 0) {
    facts.mainSleepMinutes = mainSleepMinutes;
  }

  const efficiencies = sleepEvents.map((e) => e.efficiency).filter(isNumber);
  const avgEff = average(efficiencies);
  if (avgEff !== undefined) {
    facts.efficiency = avgEff;
  }

  const latencies = sleepEvents.map((e) => e.latencyMinutes).filter(isNumber);
  const avgLatency = average(latencies);
  if (avgLatency !== undefined) {
    facts.latencyMinutes = avgLatency;
  }

  const awakenings = sleepEvents
    .map((e) => e.awakenings)
    .filter(isNumber)
    .reduce((sum, v) => sum + v, 0);

  if (awakenings > 0) {
    facts.awakenings = awakenings;
  }

  return Object.keys(facts).length > 0 ? facts : undefined;
};

const buildActivityFacts = (events: CanonicalEvent[]): DailyActivityFacts | undefined => {
  const stepsEvents = events.filter(isStepsEvent);
  const workoutEvents = events.filter(isWorkoutEvent);

  if (stepsEvents.length === 0 && workoutEvents.length === 0) return undefined;

  const facts: DailyActivityFacts = {};

  const steps = stepsEvents.reduce((sum, e) => sum + e.steps, 0);
  if (steps > 0) {
    facts.steps = steps;
  }

  const distanceKm = stepsEvents
    .map((e) => e.distanceKm)
    .filter(isNumber)
    .reduce((sum, v) => sum + v, 0);
  if (distanceKm > 0) {
    facts.distanceKm = distanceKm;
  }

  const moveMinutes = stepsEvents
    .map((e) => e.moveMinutes)
    .filter(isNumber)
    .reduce((sum, v) => sum + v, 0);
  if (moveMinutes > 0) {
    facts.moveMinutes = moveMinutes;
  }

  const trainingLoad = workoutEvents
    .map((e) => e.trainingLoad)
    .filter(isNumber)
    .reduce((sum, v) => sum + v, 0);
  if (trainingLoad > 0) {
    facts.trainingLoad = trainingLoad;
  }

  return Object.keys(facts).length > 0 ? facts : undefined;
};

const buildBodyFacts = (events: CanonicalEvent[]): DailyBodyFacts | undefined => {
  const weightEvents = events.filter(isWeightEvent);
  if (weightEvents.length === 0) return undefined;

  // latest measurement wins (lexicographic ISO timestamp sort is safe here)
  const latest = [...weightEvents].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))[
    weightEvents.length - 1
  ];

  if (!latest) return undefined;

  const facts: DailyBodyFacts = {
    weightKg: latest.weightKg,
  };

  if (isNumber(latest.bodyFatPercent)) {
    facts.bodyFatPercent = latest.bodyFatPercent;
  }

  return facts;
};

const buildRecoveryFacts = (events: CanonicalEvent[]): DailyRecoveryFacts | undefined => {
  const hrvEvents = events.filter(isHrvEvent);
  if (hrvEvents.length === 0) return undefined;

  const facts: DailyRecoveryFacts = {};

  const rmssd = hrvEvents.map((e) => e.rmssdMs).filter(isNumber);
  const avgRmssd = average(rmssd);
  if (avgRmssd !== undefined) {
    facts.hrvRmssd = avgRmssd;
  }

  // sdnnMs not promoted to DailyFacts in v1 (reserved)
  // restingHeartRate/readinessScore reserved for future sources/rules.

  return Object.keys(facts).length > 0 ? facts : undefined;
};

const buildStrengthFacts = (
  events: CanonicalEvent[],
): DailyStrengthFacts | undefined => {
  const strengthEvents = events.filter(isStrengthWorkoutEvent);
  if (strengthEvents.length === 0) return undefined;

  let totalSets = 0;
  let totalReps = 0;
  const totalVolumeByUnit: { lb?: number; kg?: number } = {};

  for (const ev of strengthEvents) {
    for (const set of ev.exercises) {
      totalSets += 1;
      totalReps += set.reps;
      const volume = set.reps * set.load;
      if (set.unit === 'lb') {
        totalVolumeByUnit.lb = (totalVolumeByUnit.lb ?? 0) + volume;
      } else {
        totalVolumeByUnit.kg = (totalVolumeByUnit.kg ?? 0) + volume;
      }
    }
  }

  const facts: DailyStrengthFacts = {
    workoutsCount: strengthEvents.length,
    totalSets,
    totalReps,
    totalVolumeByUnit,
  };

  return facts;
};

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export interface AggregateDailyFactsInput {
  userId: string;
  date: YmdDateString;
  computedAt: IsoDateTimeString;
  events: CanonicalEvent[];
}

/**
 * Aggregate CanonicalEvents for a single user + day into a DailyFacts document.
 *
 * - Pure and deterministic given the input.
 * - Uses only CanonicalEvents, never RawEvents.
 * - Safe for scheduled jobs and reprocessing pipelines.
 */
export const aggregateDailyFactsForDay = (input: AggregateDailyFactsInput): DailyFacts => {
  const { userId, date, computedAt, events } = input;

  const sleep = buildSleepFacts(events);
  const activity = buildActivityFacts(events);
  const body = buildBodyFacts(events);
  const recovery = buildRecoveryFacts(events);
  const strength = buildStrengthFacts(events);

  const dailyFacts: DailyFacts = {
    userId,
    date,
    schemaVersion: 1,
    computedAt,
  };

  if (sleep) dailyFacts.sleep = sleep;
  if (activity) dailyFacts.activity = activity;
  if (recovery) dailyFacts.recovery = recovery;
  if (body) dailyFacts.body = body;
  if (strength) dailyFacts.strength = strength;

  return dailyFacts;
};
