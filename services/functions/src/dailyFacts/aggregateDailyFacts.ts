// services/functions/src/dailyFacts/aggregateDailyFacts.ts

import type {
  CanonicalEvent,
  DailyFacts,
  DailyActivityFacts,
  DailyBodyFacts,
  DailyCardioFacts,
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
import { classifyWorkoutSportForDailyFactsRollup } from '@/lib/shared/workoutClassification';
import { buildActivityStepsAllocationV1 } from './buildActivityStepsAllocationV1';

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
    .filter((e) => classifyWorkoutSportForDailyFactsRollup(e.sport) === 'cardio')
    .map((e) => e.trainingLoad)
    .filter(isNumber)
    .reduce((sum, v) => sum + v, 0);
  if (trainingLoad > 0) {
    facts.trainingLoad = trainingLoad;
  }

  return Object.keys(facts).length > 0 ? facts : undefined;
};

const buildCardioFacts = (events: CanonicalEvent[]): DailyCardioFacts | undefined => {
  const workoutEvents = events
    .filter(isWorkoutEvent)
    .filter((e) => classifyWorkoutSportForDailyFactsRollup(e.sport) === 'cardio');
  if (workoutEvents.length === 0) return undefined;

  let durationMinutes = 0;
  let distanceMeters = 0;
  let haveDistance = false;
  let weightedHrSum = 0;
  let weightedHrMinutes = 0;
  let maxHeartRateBpm: number | undefined;
  const sportCounts = new Map<string, number>();

  // Workout Physiology v1 — energy + HR zone aggregation
  let activeEnergyKcalSum = 0;
  let haveActiveEnergy = false;
  let totalEnergyKcalSum = 0;
  let haveTotalEnergy = false;
  const zoneSum: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let zoneSessionCount = 0;
  // Daily zone basis is attached only when EVERY contributing session shares the same
  // modelVersion + thresholdsBpm tuple. Mixed bases → omit (fail-closed).
  let firstZoneBasis:
    | { modelVersion: 'default_thresholds_v1'; thresholdsBpm: readonly [number, number, number, number] }
    | null = null;
  let zoneBasisAgrees = true;

  for (const e of workoutEvents) {
    if (isNumber(e.durationMinutes) && e.durationMinutes > 0) {
      durationMinutes += e.durationMinutes;
    }
    if (typeof e.sport === "string" && e.sport.trim().length > 0) {
      const sport = e.sport.trim();
      sportCounts.set(sport, (sportCounts.get(sport) ?? 0) + 1);
    }
    if (typeof e.distanceMeters === 'number' && e.distanceMeters > 0) {
      distanceMeters += e.distanceMeters;
      haveDistance = true;
    }
    if (typeof e.averageHeartRateBpm === "number" && e.averageHeartRateBpm > 0) {
      weightedHrSum += e.averageHeartRateBpm * Math.max(0, e.durationMinutes);
      weightedHrMinutes += Math.max(0, e.durationMinutes);
    }
    if (typeof e.maxHeartRateBpm === "number" && e.maxHeartRateBpm > 0) {
      maxHeartRateBpm = maxHeartRateBpm == null ? e.maxHeartRateBpm : Math.max(maxHeartRateBpm, e.maxHeartRateBpm);
    }
    if (
      typeof e.activeEnergyKcal === 'number' &&
      Number.isFinite(e.activeEnergyKcal) &&
      e.activeEnergyKcal >= 0
    ) {
      activeEnergyKcalSum += e.activeEnergyKcal;
      haveActiveEnergy = true;
    }
    if (
      typeof e.totalEnergyKcal === 'number' &&
      Number.isFinite(e.totalEnergyKcal) &&
      e.totalEnergyKcal >= 0
    ) {
      totalEnergyKcalSum += e.totalEnergyKcal;
      haveTotalEnergy = true;
    }
    if (
      Array.isArray(e.heartRateZoneMinutes) &&
      e.heartRateZoneMinutes.length === 5 &&
      e.heartRateZoneBasis &&
      e.heartRateZoneBasis.modelVersion === 'default_thresholds_v1'
    ) {
      zoneSessionCount += 1;
      const zm = e.heartRateZoneMinutes;
      for (let i = 0; i < 5; i++) {
        const v = zm[i];
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          zoneSum[i as 0 | 1 | 2 | 3 | 4] += v;
        }
      }
      const currentBasis = {
        modelVersion: e.heartRateZoneBasis.modelVersion,
        thresholdsBpm: e.heartRateZoneBasis.thresholdsBpm,
      } as const;
      if (firstZoneBasis == null) {
        firstZoneBasis = currentBasis;
      } else if (
        firstZoneBasis.modelVersion !== currentBasis.modelVersion ||
        !arraysShallowEqual(firstZoneBasis.thresholdsBpm, currentBasis.thresholdsBpm)
      ) {
        zoneBasisAgrees = false;
      }
    }
  }

  if (durationMinutes <= 0) return undefined;

  const out: DailyCardioFacts = {
    durationMinutes,
    sessions: workoutEvents.length,
  };
  if (sportCounts.size > 0) {
    const primarySport = [...sportCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (primarySport) out.primarySport = primarySport;
  }
  if (haveDistance) {
    out.distanceMeters = distanceMeters;
    const speedMetersPerSecond = distanceMeters / (durationMinutes * 60);
    if (Number.isFinite(speedMetersPerSecond) && speedMetersPerSecond > 0) {
      out.speedMetersPerSecond = speedMetersPerSecond;
      out.paceMinPerKm = 1000 / (speedMetersPerSecond * 60);
    }
  }
  if (weightedHrMinutes > 0) {
    out.averageHeartRateBpm = weightedHrSum / weightedHrMinutes;
  }
  if (typeof maxHeartRateBpm === "number") {
    out.maxHeartRateBpm = maxHeartRateBpm;
  }
  if (haveActiveEnergy) out.activeEnergyKcal = activeEnergyKcalSum;
  if (haveTotalEnergy) out.totalEnergyKcal = totalEnergyKcalSum;
  if (zoneSessionCount > 0 && zoneBasisAgrees && firstZoneBasis != null) {
    out.heartRateZoneMinutes = [
      zoneSum[0],
      zoneSum[1],
      zoneSum[2],
      zoneSum[3],
      zoneSum[4],
    ] as const;
    out.heartRateZoneBasis = {
      modelVersion: firstZoneBasis.modelVersion,
      thresholdsBpm: firstZoneBasis.thresholdsBpm,
    };
  }
  return out;
};

/** Strict shallow equality for thresholds tuples. */
function arraysShallowEqual(
  a: readonly number[],
  b: readonly number[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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

  const resting = hrvEvents.map((e) => e.restingHeartRateBpm).filter(isNumber);
  const avgResting = average(resting);
  if (avgResting !== undefined) {
    facts.restingHeartRate = avgResting;
  }

  // sdnnMs not promoted to DailyFacts in v1 (reserved)
  // readinessScore reserved for future sources/rules.

  return Object.keys(facts).length > 0 ? facts : undefined;
};

/** lb × reps volume → kg equivalent (NIST). */
const LB_TO_KG = 0.45359237;

const roundStrengthVol = (v: number): number => Math.round(v * 10) / 10;

const buildStrengthFacts = (
  events: CanonicalEvent[],
): DailyStrengthFacts | undefined => {
  const strengthEvents = events.filter(isStrengthWorkoutEvent);
  const strengthTaggedWorkouts = events
    .filter(isWorkoutEvent)
    .filter((e) => classifyWorkoutSportForDailyFactsRollup(e.sport) === 'strength');

  if (strengthEvents.length === 0 && strengthTaggedWorkouts.length === 0) return undefined;

  let totalSets = 0;
  let totalReps = 0;
  const totalVolumeByUnit: { lb?: number; kg?: number } = {};
  let durationMinutesSum = 0;

  for (const ev of strengthEvents) {
    const startMs = Date.parse(ev.start);
    const endMs = Date.parse(ev.end);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
      durationMinutesSum += (endMs - startMs) / 60000;
    }
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

  let weightedHrSum = 0;
  let weightedHrMinutes = 0;
  let maxHeartRateBpm: number | undefined;
  const sportCounts = new Map<string, number>();

  // Workout Physiology v1 — strength energy aggregation. Only the workout-classified
  // (Apple `strength_*` sport) sessions carry energy; native `strength_workout`
  // canonical docs (manual sets) do not have energy fields in Phase B.
  let activeEnergyKcalSum = 0;
  let haveActiveEnergy = false;
  let totalEnergyKcalSum = 0;
  let haveTotalEnergy = false;

  for (const e of strengthTaggedWorkouts) {
    if (isNumber(e.durationMinutes) && e.durationMinutes > 0) {
      durationMinutesSum += e.durationMinutes;
    }
    if (typeof e.sport === 'string' && e.sport.trim().length > 0) {
      const sport = e.sport.trim();
      sportCounts.set(sport, (sportCounts.get(sport) ?? 0) + 1);
    }
    if (typeof e.averageHeartRateBpm === 'number' && e.averageHeartRateBpm > 0) {
      weightedHrSum += e.averageHeartRateBpm * Math.max(0, e.durationMinutes);
      weightedHrMinutes += Math.max(0, e.durationMinutes);
    }
    if (typeof e.maxHeartRateBpm === 'number' && e.maxHeartRateBpm > 0) {
      maxHeartRateBpm =
        maxHeartRateBpm == null ? e.maxHeartRateBpm : Math.max(maxHeartRateBpm, e.maxHeartRateBpm);
    }
    if (
      typeof e.activeEnergyKcal === 'number' &&
      Number.isFinite(e.activeEnergyKcal) &&
      e.activeEnergyKcal >= 0
    ) {
      activeEnergyKcalSum += e.activeEnergyKcal;
      haveActiveEnergy = true;
    }
    if (
      typeof e.totalEnergyKcal === 'number' &&
      Number.isFinite(e.totalEnergyKcal) &&
      e.totalEnergyKcal >= 0
    ) {
      totalEnergyKcalSum += e.totalEnergyKcal;
      haveTotalEnergy = true;
    }
  }

  const volumeKg = roundStrengthVol(
    (totalVolumeByUnit.kg ?? 0) + (totalVolumeByUnit.lb ?? 0) * LB_TO_KG,
  );

  const facts: DailyStrengthFacts = {
    workoutsCount: strengthEvents.length + strengthTaggedWorkouts.length,
    totalSets,
    totalReps,
    totalVolumeByUnit,
    ...(volumeKg > 0 ? { volumeKg } : {}),
    ...(durationMinutesSum > 0 ? { durationMinutes: roundStrengthVol(durationMinutesSum) } : {}),
  };

  if (sportCounts.size > 0) {
    const primarySport = [...sportCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (primarySport) facts.primarySport = primarySport;
  }
  if (weightedHrMinutes > 0) {
    facts.averageHeartRateBpm = weightedHrSum / weightedHrMinutes;
  }
  if (typeof maxHeartRateBpm === 'number') {
    facts.maxHeartRateBpm = maxHeartRateBpm;
  }
  if (haveActiveEnergy) facts.activeEnergyKcal = activeEnergyKcalSum;
  if (haveTotalEnergy) facts.totalEnergyKcal = totalEnergyKcalSum;

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
  // Phase 2A — attach optional NEAT/strength/cardio step partition. Fail-closed.
  if (activity) {
    const stepsAllocation = buildActivityStepsAllocationV1({
      totalSteps: activity.steps,
      workoutEvents: events.filter(isWorkoutEvent),
    });
    if (stepsAllocation) {
      activity.stepsAllocation = stepsAllocation;
    }
  }
  const cardio = buildCardioFacts(events);
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
  if (cardio) dailyFacts.cardio = cardio;
  if (recovery) dailyFacts.recovery = recovery;
  if (body) dailyFacts.body = body;
  if (strength) dailyFacts.strength = strength;
  if (nutrition) dailyFacts.nutrition = nutrition;
  const energyInfluencers: DailyFacts["energyInfluencers"] = {};
  if (activity && (activity.steps != null || activity.distanceKm != null)) {
    energyInfluencers.movement = {
      ...(typeof activity.steps === "number" ? { steps: activity.steps } : {}),
      ...(typeof activity.distanceKm === "number" ? { distanceMeters: activity.distanceKm * 1000 } : {}),
    };
  }
  if (cardio) {
    energyInfluencers.cardio = {
      ...(typeof cardio.durationMinutes === "number"
        ? { durationMinutes: cardio.durationMinutes }
        : {}),
      ...(typeof cardio.distanceMeters === "number"
        ? { distanceMeters: cardio.distanceMeters }
        : {}),
      ...(typeof cardio.primarySport === "string" ? { sport: cardio.primarySport } : {}),
      ...(typeof cardio.averageHeartRateBpm === "number"
        ? { averageHeartRateBpm: cardio.averageHeartRateBpm }
        : {}),
      ...(typeof cardio.maxHeartRateBpm === "number"
        ? { maxHeartRateBpm: cardio.maxHeartRateBpm }
        : {}),
      ...(typeof cardio.paceMinPerKm === "number"
        ? { paceMinPerKm: cardio.paceMinPerKm }
        : {}),
      ...(typeof cardio.speedMetersPerSecond === "number"
        ? { speedMetersPerSecond: cardio.speedMetersPerSecond }
        : {}),
    };
  }
  if (strength) {
    energyInfluencers.strength = {
      ...(typeof strength.durationMinutes === "number"
        ? { durationMinutes: strength.durationMinutes }
        : {}),
      ...(typeof strength.volumeKg === "number" ? { volumeKg: strength.volumeKg } : {}),
      sets: strength.totalSets,
      reps: strength.totalReps,
      ...(typeof strength.primarySport === "string" ? { sport: strength.primarySport } : {}),
      ...(typeof strength.averageHeartRateBpm === "number"
        ? { averageHeartRateBpm: strength.averageHeartRateBpm }
        : {}),
      ...(typeof strength.maxHeartRateBpm === "number"
        ? { maxHeartRateBpm: strength.maxHeartRateBpm }
        : {}),
      ...(typeof strength.volumeKg === "number" &&
      typeof strength.durationMinutes === "number" &&
      strength.durationMinutes > 0
        ? { densityKgPerMinute: roundStrengthVol(strength.volumeKg / strength.durationMinutes) }
        : {}),
    };
  }
  if (recovery && (recovery.hrvRmssd != null || recovery.restingHeartRate != null)) {
    energyInfluencers.physiology = {
      ...(typeof recovery.restingHeartRate === "number"
        ? { restingHeartRateBpm: recovery.restingHeartRate }
        : {}),
      ...(typeof recovery.hrvRmssd === "number" ? { hrvRmssdMs: recovery.hrvRmssd } : {}),
    };
  }
  if (Object.keys(energyInfluencers).length > 0) {
    dailyFacts.energyInfluencers = energyInfluencers;
  }

  return dailyFacts;
};
