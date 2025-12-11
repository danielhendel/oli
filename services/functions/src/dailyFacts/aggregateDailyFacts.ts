// services/functions/src/dailyFacts/aggregateDailyFacts.ts

import type {
    CanonicalEvent,
    DailyFacts,
    DailyActivityFacts,
    DailyBodyFacts,
    DailyRecoveryFacts,
    DailySleepFacts,
    IsoDateTimeString,
    YmdDateString,
  } from '../types/health';
  
  const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
  
  const average = (values: number[]): number | undefined => {
    if (values.length === 0) {
      return undefined;
    }
  
    const sum = values.reduce((acc, value) => acc + value, 0);
    return sum / values.length;
  };
  
  const buildSleepFacts = (events: CanonicalEvent[]): DailySleepFacts | undefined => {
    const sleepEvents = events.filter((event) => event.kind === 'sleep');
    if (sleepEvents.length === 0) {
      return undefined;
    }
  
    const facts: DailySleepFacts = {};
  
    const totalMinutes = sleepEvents.reduce((sum, event) => sum + event.totalMinutes, 0);
    if (totalMinutes > 0) {
      facts.totalMinutes = totalMinutes;
    }
  
    const mainSleepMinutes = sleepEvents.reduce((sum, event) => {
      if (event.isMainSleep) {
        return sum + event.totalMinutes;
      }
      return sum;
    }, 0);
    if (mainSleepMinutes > 0) {
      facts.mainSleepMinutes = mainSleepMinutes;
    }
  
    const efficiencies = sleepEvents
      .map((event) => event.efficiency)
      .filter(isNumber);
    const averageEfficiency = average(efficiencies);
    if (averageEfficiency !== undefined) {
      facts.efficiency = averageEfficiency;
    }
  
    const latencies = sleepEvents
      .map((event) => event.latencyMinutes)
      .filter(isNumber);
    const averageLatency = average(latencies);
    if (averageLatency !== undefined) {
      facts.latencyMinutes = averageLatency;
    }
  
    const totalAwakenings = sleepEvents.reduce((sum, event) => {
      if (isNumber(event.awakenings)) {
        return sum + (event.awakenings ?? 0);
      }
      return sum;
    }, 0);
    if (totalAwakenings > 0) {
      facts.awakenings = totalAwakenings;
    }
  
    return Object.keys(facts).length > 0 ? facts : undefined;
  };
  
  const buildActivityFacts = (events: CanonicalEvent[]): DailyActivityFacts | undefined => {
    const stepsEvents = events.filter((event) => event.kind === 'steps');
    const workoutEvents = events.filter((event) => event.kind === 'workout');
  
    if (stepsEvents.length === 0 && workoutEvents.length === 0) {
      return undefined;
    }
  
    const facts: DailyActivityFacts = {};
  
    const totalSteps = stepsEvents.reduce((sum, event) => sum + event.steps, 0);
    if (totalSteps > 0) {
      facts.steps = totalSteps;
    }
  
    const totalDistanceKm = stepsEvents.reduce((sum, event) => {
      if (isNumber(event.distanceKm)) {
        return sum + (event.distanceKm ?? 0);
      }
      return sum;
    }, 0);
    if (totalDistanceKm > 0) {
      facts.distanceKm = totalDistanceKm;
    }
  
    const totalMoveMinutes = stepsEvents.reduce((sum, event) => {
      if (isNumber(event.moveMinutes)) {
        return sum + (event.moveMinutes ?? 0);
      }
      return sum;
    }, 0);
    if (totalMoveMinutes > 0) {
      facts.moveMinutes = totalMoveMinutes;
    }
  
    const totalTrainingLoad = workoutEvents.reduce((sum, event) => {
      if (isNumber(event.trainingLoad)) {
        return sum + (event.trainingLoad ?? 0);
      }
      return sum;
    }, 0);
    if (totalTrainingLoad > 0) {
      facts.trainingLoad = totalTrainingLoad;
    }
  
    return Object.keys(facts).length > 0 ? facts : undefined;
  };
  
  const buildBodyFacts = (events: CanonicalEvent[]): DailyBodyFacts | undefined => {
    const weightEvents = events.filter((event) => event.kind === 'weight');
    if (weightEvents.length === 0) {
      return undefined;
    }
  
    const sorted = [...weightEvents].sort((a, b) => {
      if (a.start < b.start) return -1;
      if (a.start > b.start) return 1;
      return 0;
    });
  
    if (sorted.length === 0) {
      return undefined;
    }
  
    // Non-null assertion is safe here because we checked sorted.length > 0.
    const latest = sorted[sorted.length - 1]!;
  
    const facts: DailyBodyFacts = {
      weightKg: latest.weightKg,
    };
  
    if (isNumber(latest.bodyFatPercent)) {
      facts.bodyFatPercent = latest.bodyFatPercent;
    }
  
    return facts;
  };
  
  const buildRecoveryFacts = (events: CanonicalEvent[]): DailyRecoveryFacts | undefined => {
    const hrvEvents = events.filter((event) => event.kind === 'hrv');
    if (hrvEvents.length === 0) {
      return undefined;
    }
  
    const facts: DailyRecoveryFacts = {};
  
    const rmssdValues = hrvEvents
      .map((event) => event.rmssdMs)
      .filter(isNumber);
    const averageRmssd = average(rmssdValues);
    if (averageRmssd !== undefined) {
      facts.hrvRmssd = averageRmssd;
    }
  
    // sdnnMs is currently not promoted into DailyFacts.
    // readinessScore and restingHeartRate are reserved for future rules / sources.
  
    return Object.keys(facts).length > 0 ? facts : undefined;
  };
  
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
   * - Safe for use in both scheduled jobs and reprocessing pipelines.
   */
  export const aggregateDailyFactsForDay = (input: AggregateDailyFactsInput): DailyFacts => {
    const { userId, date, computedAt, events } = input;
  
    const sleep = buildSleepFacts(events);
    const activity = buildActivityFacts(events);
    const body = buildBodyFacts(events);
    const recovery = buildRecoveryFacts(events);
  
    const dailyFacts: DailyFacts = {
      userId,
      date,
      schemaVersion: 1,
      computedAt,
    };
  
    if (sleep) {
      dailyFacts.sleep = sleep;
    }
  
    if (activity) {
      dailyFacts.activity = activity;
    }
  
    if (recovery) {
      dailyFacts.recovery = recovery;
    }
  
    if (body) {
      dailyFacts.body = body;
    }
  
    return dailyFacts;
  };
  