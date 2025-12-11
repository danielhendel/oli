// services/functions/src/dailyFacts/__tests__/aggregateDailyFacts.test.ts

import { describe, it, expect } from '@jest/globals';
import type {
  CanonicalEvent,
  SleepCanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  WeightCanonicalEvent,
  HrvCanonicalEvent,
} from '../../types/health';
import { aggregateDailyFactsForDay } from '../aggregateDailyFacts';

const baseMeta = {
  userId: 'user_123',
  sourceId: 'source_manual_1',
  day: '2025-01-01',
  timezone: 'America/New_York',
  createdAt: '2025-01-02T03:00:00.000Z',
  updatedAt: '2025-01-02T03:00:00.000Z',
  schemaVersion: 1 as const,
};

const makeSleep = (overrides: Partial<SleepCanonicalEvent>): SleepCanonicalEvent => ({
  id: 'sleep_1',
  kind: 'sleep',
  start: '2025-01-01T22:00:00.000Z',
  end: '2025-01-02T06:00:00.000Z',
  totalMinutes: 480,
  efficiency: 0.9,
  latencyMinutes: 15,
  awakenings: 2,
  isMainSleep: true,
  ...baseMeta,
  ...overrides,
});

const makeSteps = (overrides: Partial<StepsCanonicalEvent>): StepsCanonicalEvent => ({
  id: 'steps_1',
  kind: 'steps',
  start: '2025-01-01T08:00:00.000Z',
  end: '2025-01-01T21:00:00.000Z',
  steps: 8000,
  distanceKm: 5,
  moveMinutes: 60,
  ...baseMeta,
  ...overrides,
});

const makeWorkout = (overrides: Partial<WorkoutCanonicalEvent>): WorkoutCanonicalEvent => ({
  id: 'workout_1',
  kind: 'workout',
  start: '2025-01-01T18:00:00.000Z',
  end: '2025-01-01T19:00:00.000Z',
  sport: 'strength_training',
  durationMinutes: 60,
  trainingLoad: 50,
  ...baseMeta,
  ...overrides,
});

const makeWeight = (overrides: Partial<WeightCanonicalEvent>): WeightCanonicalEvent => ({
  id: 'weight_1',
  kind: 'weight',
  start: '2025-01-01T07:00:00.000Z',
  end: '2025-01-01T07:00:00.000Z',
  weightKg: 80,
  bodyFatPercent: 15,
  ...baseMeta,
  ...overrides,
});

const makeHrv = (overrides: Partial<HrvCanonicalEvent>): HrvCanonicalEvent => ({
  id: 'hrv_1',
  kind: 'hrv',
  start: '2025-01-01T06:30:00.000Z',
  end: '2025-01-01T06:30:00.000Z',
  rmssdMs: 80,
  sdnnMs: 100,
  ...baseMeta,
  ...overrides,
});

describe('aggregateDailyFactsForDay', () => {
  it('aggregates sleep, activity, body, and recovery facts for a day', () => {
    const events: CanonicalEvent[] = [
      makeSleep({ id: 'sleep_main', totalMinutes: 480, isMainSleep: true }),
      makeSleep({
        id: 'sleep_nap',
        totalMinutes: 30,
        isMainSleep: false,
        efficiency: 0.8,
        latencyMinutes: 5,
        awakenings: 0,
      }),
      makeSteps({ id: 'steps_1', steps: 8000 }),
      makeSteps({ id: 'steps_2', steps: 4000 }),
      makeWorkout({ id: 'workout_1', trainingLoad: 50 }),
      makeWeight({ id: 'weight_morning', start: '2025-01-01T07:00:00.000Z', weightKg: 80 }),
      makeWeight({ id: 'weight_evening', start: '2025-01-01T20:00:00.000Z', weightKg: 79 }),
      makeHrv({ id: 'hrv_1', rmssdMs: 80 }),
      makeHrv({ id: 'hrv_2', rmssdMs: 60 }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.userId).toBe('user_123');
    expect(result.date).toBe('2025-01-01');
    expect(result.schemaVersion).toBe(1);
    expect(result.sleep).toBeDefined();
    expect(result.activity).toBeDefined();
    expect(result.body).toBeDefined();
    expect(result.recovery).toBeDefined();

    const sleep = result.sleep!;
    // 480 main + 30 nap = 510
    expect(sleep.totalMinutes).toBe(510);
    // main sleep minutes only
    expect(sleep.mainSleepMinutes).toBe(480);

    const activity = result.activity!;
    // 8000 + 4000 = 12000
    expect(activity.steps).toBe(12000);
    // training load from single workout
    expect(activity.trainingLoad).toBe(50);

    const body = result.body!;
    // latest weight event is evening 79kg
    expect(body.weightKg).toBe(79);

    const recovery = result.recovery!;
    // average of 80 and 60 = 70
    expect(recovery.hrvRmssd).toBe(70);
  });

  it('returns minimal DailyFacts when no events exist', () => {
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: [],
    });

    expect(result.userId).toBe('user_123');
    expect(result.date).toBe('2025-01-01');
    expect(result.schemaVersion).toBe(1);
    expect(result.sleep).toBeUndefined();
    expect(result.activity).toBeUndefined();
    expect(result.body).toBeUndefined();
    expect(result.recovery).toBeUndefined();
  });
});
