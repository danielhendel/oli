// services/functions/src/dailyFacts/__tests__/aggregateDailyFacts.test.ts

import { describe, it, expect } from '@jest/globals';
import type {
  CanonicalEvent,
  SleepCanonicalEvent,
  StepsCanonicalEvent,
  WorkoutCanonicalEvent,
  WeightCanonicalEvent,
  HrvCanonicalEvent,
  StrengthWorkoutCanonicalEvent,
  NutritionCanonicalEvent,
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
  sport: 'running',
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

const makeNutrition = (overrides: Partial<NutritionCanonicalEvent>): NutritionCanonicalEvent => ({
  id: 'nutrition_1',
  kind: 'nutrition',
  start: '2025-01-01T12:00:00.000Z',
  end: '2025-01-01T12:00:00.000Z',
  totalKcal: 1800,
  proteinG: 100,
  carbsG: 200,
  fatG: 70,
  ...baseMeta,
  ...overrides,
});

const makeStrengthWorkout = (
  overrides: Partial<StrengthWorkoutCanonicalEvent>,
): StrengthWorkoutCanonicalEvent => ({
  id: 'strength_1',
  kind: 'strength_workout',
  start: '2025-01-01T18:00:00.000Z',
  end: '2025-01-01T18:00:00.000Z',
  exercises: [
    { exercise: 'Bench Press', reps: 10, load: 135, unit: 'lb' },
    { exercise: 'Bench Press', reps: 8, load: 155, unit: 'lb' },
    { exercise: 'Squat', reps: 5, load: 100, unit: 'kg' },
  ],
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
    expect(sleep.primarySourceId).toBe("source_manual_1");

    const activity = result.activity!;
    // Two non-apple step events, same updatedAt: lexicographic id tie-break (steps_1 before steps_2), do not sum
    expect(activity.steps).toBe(8000);
    // training load from single workout
    expect(activity.trainingLoad).toBe(50);

    expect(result.cardio).toEqual({
      durationMinutes: 60,
      sessions: 1,
      primarySport: "running",
    });
    expect(result.energyInfluencers?.movement?.steps).toBe(8000);
    expect(result.energyInfluencers?.movement?.distanceMeters).toBe(5000);

    const body = result.body!;
    // latest weight event is evening 79kg
    expect(body.weightKg).toBe(79);

    const recovery = result.recovery!;
    // average of 80 and 60 = 70
    expect(recovery.hrvRmssd).toBe(70);
  });

  it("aggregates Oura-style HRV rmssd + resting HR into recovery and physiology", () => {
    const events: CanonicalEvent[] = [
      makeHrv({
        id: "hrv_oura_1",
        rmssdMs: 48,
        restingHeartRateBpm: 55,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: "user_123",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(result.recovery?.hrvRmssd).toBe(48);
    expect(result.recovery?.restingHeartRate).toBe(55);
    expect(result.energyInfluencers?.physiology?.hrvRmssdMs).toBe(48);
    expect(result.energyInfluencers?.physiology?.restingHeartRateBpm).toBe(55);
  });

  it("returns undefined recovery when HRV events have no numeric rmssd or resting HR", () => {
    const events: CanonicalEvent[] = [
      makeHrv({
        id: "hrv_no_signal",
        rmssdMs: null,
        restingHeartRateBpm: null,
        sdnnMs: 100,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: "user_123",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(result.recovery).toBeUndefined();
    expect(result.energyInfluencers?.physiology).toBeUndefined();
  });

  it("aggregates REM/deep minutes from main sleep episodes only", () => {
    const events: CanonicalEvent[] = [
      makeSleep({
        id: "sleep_main",
        totalMinutes: 480,
        isMainSleep: true,
        remSleepMinutes: 90,
        deepSleepMinutes: 70,
        sourceId: "oura",
      }),
      makeSleep({
        id: "sleep_nap",
        totalMinutes: 20,
        isMainSleep: false,
        remSleepMinutes: 5,
        deepSleepMinutes: 5,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: "user_123",
      date: "2025-01-01",
      computedAt: "2025-01-02T03:00:00.000Z",
      events,
    });
    expect(result.sleep?.remSleepMinutes).toBe(90);
    expect(result.sleep?.deepSleepMinutes).toBe(70);
    expect(result.sleep?.primarySourceId).toBe("oura");
  });

  it('prefers apple_health steps over other sources for the same day', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'manual_steps', sourceId: 'manual', steps: 12000 }),
      makeSteps({ id: 'appleHealth:v2:steps:2025-01-01', sourceId: 'apple_health', steps: 5011 }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.activity?.steps).toBe(5011);
  });

  it('includes activity.steps when steps canonical events sum to zero (HealthKit empty / explicit zero)', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'steps_zero', steps: 0, distanceKm: null, moveMinutes: null }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.activity?.steps).toBe(0);
  });

  it('sums nutrition macro totals across nutrition canonical events', () => {
    const events: CanonicalEvent[] = [
      makeNutrition({
        id: 'n1',
        totalKcal: 1000,
        proteinG: 60,
        carbsG: 100,
        fatG: 30,
      }),
      makeNutrition({
        id: 'n2',
        totalKcal: 500,
        proteinG: 30,
        carbsG: 50,
        fatG: 20,
        fiberG: 12,
      }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.nutrition).toBeDefined();
    const n = result.nutrition!;
    expect(n.totalKcal).toBe(1500);
    expect(n.proteinG).toBe(90);
    expect(n.carbsG).toBe(150);
    expect(n.fatG).toBe(50);
    expect(n.fiberG).toBe(12);
  });

  it('counts meal-scoped nutrition events and rolls up optional sugars and sodium', () => {
    const events: CanonicalEvent[] = [
      makeNutrition({
        id: 'meal_a',
        start: '2025-01-01T08:00:00.000Z',
        end: '2025-01-01T08:00:01.000Z',
        totalKcal: 300,
        proteinG: 20,
        carbsG: 30,
        fatG: 10,
        logScope: 'meal',
        sugarG: 8,
        sodiumMg: 100,
      }),
      makeNutrition({
        id: 'meal_b',
        start: '2025-01-01T13:00:00.000Z',
        end: '2025-01-01T13:00:01.000Z',
        totalKcal: 200,
        proteinG: 15,
        carbsG: 20,
        fatG: 8,
        logScope: 'meal',
        sugarG: 4,
        sodiumMg: 50,
      }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    const n = result.nutrition!;
    expect(n.totalKcal).toBe(500);
    expect(n.mealCount).toBe(2);
    expect(n.loggedMealCount).toBe(2);
    expect(n.firstMealAt).toBe('2025-01-01T08:00:00.000Z');
    expect(n.lastMealAt).toBe('2025-01-01T13:00:00.000Z');
    expect(n.sugarG).toBe(12);
    expect(n.sodiumMg).toBe(150);
  });

  it('computes nutrition V2 ratios, timing spread, and scores from canonical meal events', () => {
    const events: CanonicalEvent[] = [
      makeNutrition({
        id: 'meal_a',
        start: '2025-01-01T08:00:00.000Z',
        end: '2025-01-01T08:00:01.000Z',
        totalKcal: 300,
        proteinG: 20,
        carbsG: 30,
        fatG: 10,
        logScope: 'meal',
      }),
      makeNutrition({
        id: 'meal_b',
        start: '2025-01-01T13:00:00.000Z',
        end: '2025-01-01T13:00:01.000Z',
        totalKcal: 200,
        proteinG: 15,
        carbsG: 20,
        fatG: 8,
        logScope: 'meal',
      }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    const n = result.nutrition!;
    expect(n.totalKcal).toBe(500);
    expect(n.proteinRatio).toBe(0.28);
    expect(n.carbRatio).toBe(0.4);
    expect(n.fatRatio).toBe(0.324);
    expect(n.mealTimingSpread).toBe(5);
    expect(n.macroBalanceScore).toBe(95);
    expect(n.calorieDistributionScore).toBe(40);
  });

  it('aggregates strength facts correctly including mixed-unit volume', () => {
    const events: CanonicalEvent[] = [
      makeStrengthWorkout({
        id: 'strength_1',
        exercises: [
          { exercise: 'Bench Press', reps: 10, load: 135, unit: 'lb' },
          { exercise: 'Bench Press', reps: 8, load: 155, unit: 'lb' },
        ],
      }),
      makeStrengthWorkout({
        id: 'strength_2',
        exercises: [
          { exercise: 'Squat', reps: 5, load: 100, unit: 'kg' },
          { exercise: 'Squat', reps: 5, load: 120, unit: 'kg' },
        ],
      }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.strength).toBeDefined();
    const strength = result.strength!;
    expect(strength.workoutsCount).toBe(2);
    expect(strength.totalSets).toBe(4);
    expect(strength.totalReps).toBe(28); // 10+8+5+5
    expect(strength.totalVolumeByUnit.lb).toBe(10 * 135 + 8 * 155); // 1350 + 1240 = 2590
    expect(strength.totalVolumeByUnit.kg).toBe(5 * 100 + 5 * 120); // 500 + 600 = 1100
    const expectedKg =
      (strength.totalVolumeByUnit.kg ?? 0) + (strength.totalVolumeByUnit.lb ?? 0) * 0.45359237;
    expect(strength.volumeKg).toBe(Math.round(expectedKg * 10) / 10);
  });

  it('sums strength durationMinutes from canonical start/end windows', () => {
    const events: CanonicalEvent[] = [
      makeStrengthWorkout({
        id: 's1',
        start: '2025-01-01T18:00:00.000Z',
        end: '2025-01-01T18:45:00.000Z',
        exercises: [{ exercise: 'Press', reps: 10, load: 60, unit: 'kg' }],
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.strength?.durationMinutes).toBe(45);
  });

  it('omits strength field when no strength workouts exist', () => {
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: [makeSleep({}), makeSteps({})],
    });

    expect(result.strength).toBeUndefined();
  });

  it('prefers apple_health steps when another source also reports steps (no double count)', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'manual_1', sourceId: 'manual_entry', steps: 9000 }),
      makeSteps({ id: 'ah_1', sourceId: 'apple_health', steps: 5012 }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.activity?.steps).toBe(5012);
  });

  it('collapses duplicate apple_health rows sharing sourceSampleId to latest updatedAt', () => {
    const events: CanonicalEvent[] = [
      makeSteps({
        id: 'raw_early',
        sourceId: 'apple_health',
        sourceSampleId: 'HK-1',
        steps: 15577,
        updatedAt: '2025-01-01T08:00:00.000Z',
      }),
      makeSteps({
        id: 'raw_late',
        sourceId: 'apple_health',
        sourceSampleId: 'HK-1',
        steps: 148,
        updatedAt: '2025-01-01T18:00:00.000Z',
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.activity?.steps).toBe(148);
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
    expect(result.strength).toBeUndefined();
    expect(result.cardio).toBeUndefined();
    expect(result.energy).toBeUndefined();
  });

  it('aggregates cardio rollups from workout canonical events (duration, sessions, optional distance)', () => {
    const events: CanonicalEvent[] = [
      makeWorkout({
        id: 'run_1',
        sport: 'running',
        durationMinutes: 30,
        distanceMeters: 5000,
        trainingLoad: null,
      }),
      makeWorkout({
        id: 'run_2',
        sport: 'running',
        durationMinutes: 20,
        distanceMeters: 3000,
        trainingLoad: null,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.cardio).toEqual({
      durationMinutes: 50,
      distanceMeters: 8000,
      sessions: 2,
      primarySport: "running",
      paceMinPerKm: 6.25,
      speedMetersPerSecond: 2.6666666666666665,
    });
    expect(result.energyInfluencers?.cardio?.distanceMeters).toBe(8000);
  });

  it('classifies Apple-style TraditionalStrengthTraining as strength only (not cardio)', () => {
    const events: CanonicalEvent[] = [
      makeWorkout({
        id: 'lift_1',
        sport: 'TraditionalStrengthTraining',
        durationMinutes: 52,
        trainingLoad: 40,
        averageHeartRateBpm: 118,
        maxHeartRateBpm: 142,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.cardio).toBeUndefined();
    expect(result.strength).toEqual({
      workoutsCount: 1,
      totalSets: 0,
      totalReps: 0,
      totalVolumeByUnit: {},
      durationMinutes: 52,
      primarySport: 'TraditionalStrengthTraining',
      averageHeartRateBpm: 118,
      maxHeartRateBpm: 142,
    });
    expect(result.activity?.trainingLoad).toBeUndefined();
  });

  it('separates cardio and strength on mixed workout days', () => {
    const events: CanonicalEvent[] = [
      makeWorkout({
        id: 'run_1',
        sport: 'running',
        durationMinutes: 30,
        distanceMeters: 5000,
        trainingLoad: 10,
      }),
      makeWorkout({
        id: 'lift_1',
        sport: 'Functional Strength Training',
        durationMinutes: 40,
        trainingLoad: 12,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.cardio).toMatchObject({
      durationMinutes: 30,
      distanceMeters: 5000,
      sessions: 1,
      primarySport: 'running',
    });
    expect(result.cardio?.paceMinPerKm).toBeCloseTo(6, 10);
    expect(result.cardio?.speedMetersPerSecond).toBeCloseTo(5000 / 1800, 10);
    expect(result.strength?.durationMinutes).toBe(40);
    expect(result.strength?.workoutsCount).toBe(1);
    expect(result.strength?.primarySport).toBe('Functional Strength Training');
    expect(result.activity?.trainingLoad).toBe(10);
  });

  it('includes cardio duration when workouts omit distance', () => {
    const events: CanonicalEvent[] = [
      makeWorkout({
        id: 'bike_1',
        sport: 'cycling',
        durationMinutes: 45,
        trainingLoad: 12,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.cardio).toEqual({
      durationMinutes: 45,
      sessions: 1,
      primarySport: "cycling",
    });
  });

  it('still includes sleep when canonical sleep episodes exist but summed minutes are zero', () => {
    const events: CanonicalEvent[] = [
      makeSleep({
        id: 'sleep_zero',
        totalMinutes: 0,
        efficiency: null,
        latencyMinutes: null,
        awakenings: null,
        isMainSleep: false,
        remSleepMinutes: null,
        deepSleepMinutes: null,
      }),
    ];
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });
    expect(result.sleep).toBeDefined();
    expect(result.sleep!.totalMinutes).toBe(0);
    expect(result.sleep!.primarySourceId).toBe('source_manual_1');
  });

  it('includes body from factOnlyBody when no canonical weight events exist', () => {
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: [],
      factOnlyBody: { weightKg: 73.5, bodyFatPercent: 18 },
    });

    expect(result.body).toBeDefined();
    expect(result.body!.weightKg).toBe(73.5);
    expect(result.body!.bodyFatPercent).toBe(18);
  });

  it('includes extended body metrics from factOnlyBody', () => {
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: [],
      factOnlyBody: {
        bmi: 23.8,
        leanBodyMassKg: 61.2,
        restingMetabolicRateKcal: 1690,
      },
    });
    expect(result.body).toEqual({
      bmi: 23.8,
      leanBodyMassKg: 61.2,
      restingMetabolicRateKcal: 1690,
    });
  });

  it('prefers canonical weight events over factOnlyBody when both exist', () => {
    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: [makeWeight({ weightKg: 80, bodyFatPercent: 15 })],
      factOnlyBody: { weightKg: 73.5 },
    });

    expect(result.body).toBeDefined();
    expect(result.body!.weightKg).toBe(80);
    expect(result.body!.bodyFatPercent).toBe(15);
  });

  // ---------------------------------------------------------------------------
  // Phase 2A — activity.stepsAllocation
  // ---------------------------------------------------------------------------

  it('Phase 2A — attaches activity.stepsAllocation when total steps + cardio workout with steps exist', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'ah_steps', sourceId: 'apple_health', steps: 10000 }),
      makeWorkout({
        id: 'wkrun',
        sport: 'running',
        start: '2025-01-01T07:00:00.000Z',
        end: '2025-01-01T08:00:00.000Z',
        steps: 4500,
      }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.activity?.steps).toBe(10000);
    expect(result.activity?.stepsAllocation).toEqual({
      modelVersion: 'activity_steps_allocation_v1',
      neatSteps: 5500,
      strengthSteps: 0,
      cardioSteps: 4500,
      inputsUsed: expect.arrayContaining([
        'activity.steps',
        'workout.steps',
        'workout.classifiedCardio',
      ]),
      inputsMissing: [],
    });
  });

  it('Phase 2A — fail-closed: cardio workout without steps → omit stepsAllocation', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'ah_steps', sourceId: 'apple_health', steps: 10000 }),
      makeWorkout({ id: 'wkrun', sport: 'running' }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.activity?.steps).toBe(10000);
    expect(result.activity?.stepsAllocation).toBeUndefined();
  });

  it('Phase 2A — no classified workouts: all steps allocated to NEAT', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'ah_steps', sourceId: 'apple_health', steps: 9000 }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.activity?.stepsAllocation).toEqual({
      modelVersion: 'activity_steps_allocation_v1',
      neatSteps: 9000,
      strengthSteps: 0,
      cardioSteps: 0,
      inputsUsed: ['activity.steps'],
      inputsMissing: [],
    });
  });

  it('Phase 2A — strength-classified WorkoutCanonicalEvent.steps allocate to strengthSteps', () => {
    const events: CanonicalEvent[] = [
      makeSteps({ id: 'ah_steps', sourceId: 'apple_health', steps: 9000 }),
      makeWorkout({
        id: 'wklift',
        sport: 'Traditional Strength Training',
        start: '2025-01-01T18:00:00.000Z',
        end: '2025-01-01T19:00:00.000Z',
        steps: 800,
      }),
    ];

    const result = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events,
    });

    expect(result.activity?.stepsAllocation).toBeDefined();
    expect(result.activity?.stepsAllocation?.strengthSteps).toBe(800);
    expect(result.activity?.stepsAllocation?.cardioSteps).toBe(0);
    expect(result.activity?.stepsAllocation?.neatSteps).toBe(8200);
  });

  it('Phase 2A — energy fields are unaffected by stepsAllocation presence', () => {
    const baseline: CanonicalEvent[] = [
      makeSteps({ id: 'ah_steps_a', sourceId: 'apple_health', steps: 10000 }),
      makeWorkout({ id: 'wkrun_a', sport: 'running' }),
    ];
    const enriched: CanonicalEvent[] = [
      makeSteps({ id: 'ah_steps_b', sourceId: 'apple_health', steps: 10000 }),
      makeWorkout({ id: 'wkrun_b', sport: 'running', steps: 4500 }),
    ];

    const r1 = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: baseline,
    });
    const r2 = aggregateDailyFactsForDay({
      userId: 'user_123',
      date: '2025-01-01',
      computedAt: '2025-01-02T03:00:00.000Z',
      events: enriched,
    });

    // Steps allocation only present in the enriched run.
    expect(r1.activity?.stepsAllocation).toBeUndefined();
    expect(r2.activity?.stepsAllocation).toBeDefined();
    // Energy & influencer surfaces are identical regardless of stepsAllocation.
    expect(r1.energy).toEqual(r2.energy);
    expect(r1.energyInfluencers).toEqual(r2.energyInfluencers);
    expect(r1.activity?.steps).toEqual(r2.activity?.steps);
  });
});
