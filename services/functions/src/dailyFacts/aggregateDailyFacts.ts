// services/functions/src/dailyFacts/aggregateDailyFacts.ts

import type {
  CanonicalEvent,
  DailyFacts,
  DailyActivityFacts,
  DailyBodyFacts,
  DailyRecoveryFacts,
  DailySleepFacts,
  DailyStrengthFacts,
  DailyNutritionFacts,
  IsoDateTimeString,
  YmdDateString,
  SleepCanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  WeightCanonicalEvent,
  HrvCanonicalEvent,
  StrengthWorkoutCanonicalEvent,
  NutritionCanonicalEvent,
} from '../types/health';

// Steps scalar uses {@link pickContributingStepEventsForDailyFacts} (time + id dedupe, not max(steps)).
import {
  pickContributingStepEventsForDailyFacts,
  resolvedStepsTotalFromContributing,
} from '@oli/contracts';

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

const isNutritionEvent = (e: CanonicalEvent): e is NutritionCanonicalEvent => e.kind === 'nutrition';

// -----------------------------------------------------------------------------
// Builders
// -----------------------------------------------------------------------------

const buildSleepFacts = (events: CanonicalEvent[]): DailySleepFacts | undefined => {
  const sleepEvents = events.filter(isSleepEvent);
  if (sleepEvents.length === 0) return undefined;

  const facts: DailySleepFacts = {};

  const totalMinutes = sleepEvents.reduce((sum, e) => sum + e.totalMinutes, 0);
  facts.totalMinutes = totalMinutes;

  const mainEpisodes = sleepEvents.filter((e) => e.isMainSleep);

  const mainSleepMinutes = mainEpisodes.reduce((sum, e) => sum + e.totalMinutes, 0);
  if (mainEpisodes.length > 0) {
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

  const remStages = mainEpisodes.map((e) => e.remSleepMinutes).filter(isNumber);
  const remSum = remStages.reduce((sum, v) => sum + v, 0);
  if (remSum > 0) {
    facts.remSleepMinutes = remSum;
  }

  const deepStages = mainEpisodes.map((e) => e.deepSleepMinutes).filter(isNumber);
  const deepSum = deepStages.reduce((sum, v) => sum + v, 0);
  if (deepSum > 0) {
    facts.deepSleepMinutes = deepSum;
  }

  const primaryPool: SleepCanonicalEvent[] =
    mainEpisodes.length > 0 ? mainEpisodes : sleepEvents;
  let primary: SleepCanonicalEvent = primaryPool[0]!;
  for (const e of primaryPool) {
    if (e.totalMinutes > primary.totalMinutes) primary = e;
  }
  facts.primarySourceId = primary.sourceId;

  return facts;
};

const buildActivityFacts = (events: CanonicalEvent[]): DailyActivityFacts | undefined => {
  const stepsEvents = events.filter(isStepsEvent);
  const workoutEvents = events.filter(isWorkoutEvent);

  if (stepsEvents.length === 0 && workoutEvents.length === 0) return undefined;

  const facts: DailyActivityFacts = {};

  const contributing = pickContributingStepEventsForDailyFacts(stepsEvents);
  if (contributing.length > 0) {
    facts.steps = resolvedStepsTotalFromContributing(contributing);
  }

  const distanceKm = contributing
    .map((e) => e.distanceKm)
    .filter(isNumber)
    .reduce((sum, v) => sum + v, 0);
  if (distanceKm > 0) {
    facts.distanceKm = distanceKm;
  }

  const moveMinutes = contributing
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

const buildNutritionFacts = (events: CanonicalEvent[]): DailyNutritionFacts | undefined => {
  const nutritionEvents = events.filter(isNutritionEvent);
  if (nutritionEvents.length === 0) return undefined;

  let totalKcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberSum = 0;
  let haveFiber = false;
  let sugarSum = 0;
  let haveSugar = false;
  let sodiumSum = 0;
  let haveSodium = false;
  let potassiumSum = 0;
  let havePotassium = false;

  let mealCount = 0;
  let firstMealAt: string | undefined;
  let lastMealAt: string | undefined;
  const mealScoped: NutritionCanonicalEvent[] = [];

  for (const e of nutritionEvents) {
    totalKcal += e.totalKcal;
    proteinG += e.proteinG;
    carbsG += e.carbsG;
    fatG += e.fatG;
    if (typeof e.fiberG === 'number' && Number.isFinite(e.fiberG)) {
      fiberSum += e.fiberG;
      haveFiber = true;
    }
    if (typeof e.sugarG === 'number' && Number.isFinite(e.sugarG)) {
      sugarSum += e.sugarG;
      haveSugar = true;
    }
    if (typeof e.sodiumMg === 'number' && Number.isFinite(e.sodiumMg)) {
      sodiumSum += e.sodiumMg;
      haveSodium = true;
    }
    if (typeof e.potassiumMg === 'number' && Number.isFinite(e.potassiumMg)) {
      potassiumSum += e.potassiumMg;
      havePotassium = true;
    }

    if (e.logScope === 'meal') {
      mealCount += 1;
      mealScoped.push(e);
      const anchor = e.start;
      if (firstMealAt === undefined || anchor < firstMealAt) {
        firstMealAt = anchor;
      }
      if (lastMealAt === undefined || anchor > lastMealAt) {
        lastMealAt = anchor;
      }
    }
  }

  const round4 = (n: number): number => Math.round(n * 10000) / 10000;

  const facts: DailyNutritionFacts = {
    totalKcal,
    proteinG,
    carbsG,
    fatG,
  };
  if (haveFiber) {
    facts.fiberG = fiberSum;
  }
  if (haveSugar) {
    facts.sugarG = sugarSum;
  }
  if (haveSodium) {
    facts.sodiumMg = sodiumSum;
  }
  if (havePotassium) {
    facts.potassiumMg = potassiumSum;
  }
  if (mealCount > 0) {
    facts.mealCount = mealCount;
    facts.loggedMealCount = mealCount;
    if (firstMealAt !== undefined) {
      facts.firstMealAt = firstMealAt;
    }
    if (lastMealAt !== undefined) {
      facts.lastMealAt = lastMealAt;
    }
  }

  if (totalKcal > 0) {
    const pR = round4((4 * proteinG) / totalKcal);
    const cR = round4((4 * carbsG) / totalKcal);
    const fR = round4((9 * fatG) / totalKcal);
    facts.proteinRatio = pR;
    facts.carbRatio = cR;
    facts.fatRatio = fR;
    const dev = Math.abs(pR - 0.25) + Math.abs(cR - 0.45) + Math.abs(fR - 0.3);
    facts.macroBalanceScore = Math.max(0, Math.min(100, Math.round(100 - 50 * dev)));
  }

  if (mealScoped.length >= 2 && firstMealAt !== undefined && lastMealAt !== undefined) {
    const spreadMs = Date.parse(lastMealAt) - Date.parse(firstMealAt);
    if (Number.isFinite(spreadMs) && spreadMs >= 0) {
      facts.mealTimingSpread = round4(spreadMs / 3_600_000);
    }
  }

  if (mealScoped.length >= 2 && totalKcal > 0) {
    let maxK = 0;
    for (const m of mealScoped) {
      if (m.totalKcal > maxK) maxK = m.totalKcal;
    }
    facts.calorieDistributionScore = Math.max(
      0,
      Math.min(100, Math.round(100 * (1 - maxK / totalKcal))),
    );
  } else {
    facts.calorieDistributionScore = 100;
  }

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
  /**
   * Optional body facts from fact-only raw events (e.g. weight).
   * Used when no canonical weight events exist for the day.
   * Constitutional: we compute derived truth from non-event inputs.
   */
  factOnlyBody?: DailyBodyFacts;
}

/**
 * Aggregate CanonicalEvents for a single user + day into a DailyFacts document.
 *
 * - Pure and deterministic given the input.
 * - Uses CanonicalEvents for most domains; factOnlyBody for body when no canonical weight.
 * - Safe for scheduled jobs and reprocessing pipelines.
 */
export const aggregateDailyFactsForDay = (input: AggregateDailyFactsInput): DailyFacts => {
  const { userId, date, computedAt, events, factOnlyBody } = input;

  const sleep = buildSleepFacts(events);
  const activity = buildActivityFacts(events);
  const body = buildBodyFacts(events) ?? factOnlyBody;
  const recovery = buildRecoveryFacts(events);
  const strength = buildStrengthFacts(events);
  const nutrition = buildNutritionFacts(events);

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
  if (nutrition) dailyFacts.nutrition = nutrition;

  return dailyFacts;
};
