import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { StrengthTodayCardModel } from "@/lib/data/workouts/strengthTodayCardModel";
import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  STRENGTH_TODAY_DETAIL_METRIC_LABELS,
  STRENGTH_TODAY_DETAIL_MISSING_VALUE,
  buildStrengthTodayDetailVm,
  formatStrengthTodayAvgHeartRateValue,
  formatStrengthTodayCalorieBurnValue,
} from "@/lib/data/workouts/strengthTodayDetailVm";

const TODAY = "2026-03-12" as DayKey;

const restCardModel: StrengthTodayCardModel = {
  kind: "rest",
  pill: "Rest",
  primaryTitle: "No workout today",
  durationLabel: "",
  subtitle: "Log a session when you train",
};

const completedCardModel: StrengthTodayCardModel = {
  kind: "completed",
  pill: "Completed",
  sectionEyebrow: "Completed Today",
  primaryTitle: "Pull Day",
  durationLabel: "57 min",
  subtitle: "17 sets · Back focused",
  workingVolume: {
    title: "Working Volume",
    rows: [
      { muscleGroup: "back", setCount: 11 },
      { muscleGroup: "biceps", setCount: 6 },
    ],
    exercisesByMuscleGroup: {
      back: [
        { exerciseName: "Pull Up", setCount: 6 },
        { exerciseName: "Barbell Row", setCount: 5 },
      ],
      biceps: [{ exerciseName: "Hammer Curl", setCount: 6 }],
    },
  },
};

function ex(name: string, setCount: number) {
  return {
    exerciseId: `id:${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    sets: Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      reps: 8,
      weightKg: 50,
      intensity: 8,
    })),
  };
}

const completedExercises = [ex("Pull Up", 6), ex("Barbell Row", 5), ex("Hammer Curl", 6)];

function strengthSessionWithHr(
  workouts: { durationMinutes: number; averageHeartRateBpm?: number; heartRateZoneMinutes?: readonly number[] }[],
): ReconciledWorkoutSession {
  return {
    id: "session-1",
    day: TODAY,
    sessionType: "strength",
    title: "Pull Day",
    titleSource: "provider",
    start: "2026-03-12T08:00:00.000Z",
    end: "2026-03-12T09:00:00.000Z",
    durationMinutes: 57,
    calories: null,
    workouts: workouts.map((w, i) => ({
      id: `w${i}`,
      observedAt: "2026-03-12T08:00:00.000Z",
      sourceId: "apple_health",
      title: "Traditional Strength Training",
      start: "2026-03-12T08:00:00.000Z",
      end: "2026-03-12T09:00:00.000Z",
      durationMinutes: w.durationMinutes,
      calories: null,
      ...(w.averageHeartRateBpm != null ? { averageHeartRateBpm: w.averageHeartRateBpm } : {}),
      ...(w.heartRateZoneMinutes != null ? { heartRateZoneMinutes: w.heartRateZoneMinutes } : {}),
    })) as ReconciledWorkoutSession["workouts"],
    sourceSummaries: [],
    sourceCount: 1,
  };
}

function energyWithStrength(opts: {
  kcalLow?: number;
  kcalHigh?: number;
  averageHeartRateBpm?: number;
}): DailyEnergyCardDto {
  return {
    modelVersion: "vTest",
    computedAt: "2026-03-12T00:00:00.000Z",
    day: TODAY,
    estimatedKcal: { low: 2000, high: 2500, midpoint: 2250 },
    variancePct: 0.05,
    confidence: "moderate",
    factors: {
      strength: {
        ...(opts.kcalLow != null ? { kcalLow: opts.kcalLow } : {}),
        ...(opts.kcalHigh != null ? { kcalHigh: opts.kcalHigh } : {}),
      },
    },
    missingRequiredInputs: [],
    energyInfluencers: {
      strength: {
        ...(opts.averageHeartRateBpm != null
          ? { averageHeartRateBpm: opts.averageHeartRateBpm }
          : {}),
      },
    },
  };
}

describe("formatStrengthTodayAvgHeartRateValue", () => {
  it('returns "—" when undefined / null / not finite / non-positive', () => {
    expect(formatStrengthTodayAvgHeartRateValue(undefined)).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
    expect(formatStrengthTodayAvgHeartRateValue(null)).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
    expect(formatStrengthTodayAvgHeartRateValue(Number.NaN)).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
    expect(formatStrengthTodayAvgHeartRateValue(0)).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
    expect(formatStrengthTodayAvgHeartRateValue(-5)).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
  });
  it("rounds and appends bpm", () => {
    expect(formatStrengthTodayAvgHeartRateValue(98)).toBe("98 bpm");
    expect(formatStrengthTodayAvgHeartRateValue(97.4)).toBe("97 bpm");
    expect(formatStrengthTodayAvgHeartRateValue(97.6)).toBe("98 bpm");
  });
});

describe("formatStrengthTodayCalorieBurnValue", () => {
  it('returns "—" when factor undefined / missing range / missing kcal', () => {
    expect(formatStrengthTodayCalorieBurnValue(undefined)).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
    expect(formatStrengthTodayCalorieBurnValue({})).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
  });
  it('formats as "+low–high kcal" using the shared Daily Energy formatter (no parallel calc)', () => {
    expect(formatStrengthTodayCalorieBurnValue({ kcalLow: 252, kcalHigh: 432 })).toBe(
      "+252\u2013432 kcal",
    );
  });
});

describe("buildStrengthTodayDetailVm — rest branch", () => {
  it("returns rest VM when cardModel is null", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: null,
      actionWorkoutExercises: [],
      energy: undefined,
    });
    expect(vm.status).toBe("rest");
    if (vm.status === "rest") {
      expect(vm.pill).toBe("Rest");
      expect(vm.hero).toBe("No workout today");
      expect(vm.subtitleLine).toBe("Log a session when you train");
    }
  });

  it("returns rest VM when cardModel.kind === 'rest'", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: restCardModel,
      actionWorkoutExercises: [],
      energy: energyWithStrength({ kcalLow: 252, kcalHigh: 432, averageHeartRateBpm: 98 }),
    });
    expect(vm.status).toBe("rest");
  });
});

describe("buildStrengthTodayDetailVm — completed branch", () => {
  it("emits rows in the exact approved order: duration, totalVolume, estimatedCalorieBurn, avgHeartRate", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: energyWithStrength({ kcalLow: 252, kcalHigh: 432, averageHeartRateBpm: 98 }),
    });
    expect(vm.status).toBe("completed");
    if (vm.status === "completed") {
      expect(vm.rows.map((r) => r.id)).toEqual([
        "duration",
        "totalVolume",
        "estimatedCalorieBurn",
        "avgHeartRate",
      ]);
      expect(vm.rows.map((r) => r.label)).toEqual([
        STRENGTH_TODAY_DETAIL_METRIC_LABELS.duration,
        STRENGTH_TODAY_DETAIL_METRIC_LABELS.totalVolume,
        STRENGTH_TODAY_DETAIL_METRIC_LABELS.estimatedCalorieBurn,
        STRENGTH_TODAY_DETAIL_METRIC_LABELS.avgHeartRate,
      ]);
    }
  });

  it("hero = primaryTitle, pill = Completed, subtitleLine = cardModel.subtitle (trimmed)", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vm.status === "completed") {
      expect(vm.hero).toBe("Pull Day");
      expect(vm.pill).toBe("Completed");
      expect(vm.subtitleLine).toBe("17 sets · Back focused");
    }
  });

  it("subtitleLine is null when cardModel.subtitle is empty / whitespace", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: { ...completedCardModel, subtitle: "   " },
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vm.status === "completed") expect(vm.subtitleLine).toBeNull();
  });

  it("duration row mirrors cardModel.durationLabel; — when empty", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vm.status === "completed") expect(vm.rows[0]?.value).toBe("57 min");

    const vmEmpty = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: { ...completedCardModel, durationLabel: "" },
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vmEmpty.status === "completed")
      expect(vmEmpty.rows[0]?.value).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
  });

  it('totalVolume row sums every logged set via sumWorkoutDetailTotalVolumeSets ("17 sets")', () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vm.status === "completed") expect(vm.rows[1]?.value).toBe("17 sets");
  });

  it('totalVolume uses singular "1 set" when exactly one logged set', () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: [ex("Pull Up", 1)],
      energy: undefined,
    });
    if (vm.status === "completed") expect(vm.rows[1]?.value).toBe("1 set");
  });

  it('totalVolume = "—" when no exercises were resolved for the session', () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: [],
      energy: undefined,
    });
    if (vm.status === "completed")
      expect(vm.rows[1]?.value).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
  });

  it("estimatedCalorieBurn reuses the Daily Energy strength factor (no parallel calc)", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: energyWithStrength({ kcalLow: 252, kcalHigh: 432 }),
    });
    if (vm.status === "completed") expect(vm.rows[2]?.value).toBe("+252\u2013432 kcal");
  });

  it('estimatedCalorieBurn = "—" when energy is undefined (loading / error / signed-out)', () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vm.status === "completed")
      expect(vm.rows[2]?.value).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
  });

  it('estimatedCalorieBurn = "—" when factor.strength is missing kcalLow/kcalHigh', () => {
    const energy = energyWithStrength({});
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy,
    });
    if (vm.status === "completed")
      expect(vm.rows[2]?.value).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
  });

  it("avgHeartRate uses energyInfluencers.strength.averageHeartRateBpm (rounded, bpm)", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: energyWithStrength({ averageHeartRateBpm: 98 }),
    });
    if (vm.status === "completed") {
      expect(vm.rows[3]?.value).toBe("98 bpm");
      expect(vm.rows[3]?.tappable).toBe(true);
    }
  });

  it('avgHeartRate = "—" when energy or influencer or HR is missing', () => {
    const cases: (DailyEnergyCardDto | undefined)[] = [
      undefined,
      energyWithStrength({}),
      energyWithStrength({ averageHeartRateBpm: 0 }),
    ];
    for (const energy of cases) {
      const vm = buildStrengthTodayDetailVm({
        todayDayKey: TODAY,
        cardModel: completedCardModel,
        actionWorkoutExercises: completedExercises,
        energy,
      });
      if (vm.status === "completed")
        expect(vm.rows[3]?.value).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
    }
  });

  it("avgHeartRate renders from hydrated session physiology when DailyFacts is missing/stale", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
      todayStrengthSessions: [
        strengthSessionWithHr([{ durationMinutes: 50, averageHeartRateBpm: 108 }]),
      ],
    });
    if (vm.status === "completed") {
      expect(vm.rows[3]?.value).toBe("108 bpm");
      expect(vm.rows[3]?.tappable).toBe(true);
    }
  });

  it("avgHeartRate duration-weights multiple strength sessions from session physiology", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
      todayStrengthSessions: [
        strengthSessionWithHr([{ durationMinutes: 60, averageHeartRateBpm: 100 }]),
        strengthSessionWithHr([{ durationMinutes: 30, averageHeartRateBpm: 120 }]),
      ],
    });
    if (vm.status === "completed") {
      expect(vm.rows[3]?.value).toBe("107 bpm");
    }
  });

  it("prefers session physiology over DailyFacts when both exist", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: energyWithStrength({ averageHeartRateBpm: 98 }),
      todayStrengthSessions: [
        strengthSessionWithHr([{ durationMinutes: 50, averageHeartRateBpm: 108 }]),
      ],
    });
    if (vm.status === "completed") expect(vm.rows[3]?.value).toBe("108 bpm");
  });

  it("manual strength session without HR still shows — and avgHeartRate row is not tappable", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
      todayStrengthSessions: [strengthSessionWithHr([{ durationMinutes: 45 }])],
    });
    if (vm.status === "completed") {
      expect(vm.rows[3]?.value).toBe(STRENGTH_TODAY_DETAIL_MISSING_VALUE);
      expect(vm.rows[3]?.tappable).toBeUndefined();
    }
  });

  it("avgHeartRate row is tappable when only session zones exist (no avg HR in DailyFacts)", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
      todayStrengthSessions: [
        strengthSessionWithHr([
          {
            durationMinutes: 50,
            heartRateZoneMinutes: [32.816, 1.183, 0, 0, 0],
          },
        ]),
      ],
    });
    if (vm.status === "completed") expect(vm.rows[3]?.tappable).toBe(true);
  });

  it("only the avgHeartRate row is tappable; the other three are not", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: energyWithStrength({ kcalLow: 252, kcalHigh: 432, averageHeartRateBpm: 98 }),
    });
    if (vm.status === "completed") {
      expect(vm.rows[0]?.tappable).toBeUndefined();
      expect(vm.rows[1]?.tappable).toBeUndefined();
      expect(vm.rows[2]?.tappable).toBeUndefined();
      expect(vm.rows[3]?.tappable).toBe(true);
    }
  });

  it("muscleVolume mirrors cardModel.workingVolume; null when not eligible", () => {
    const vmFull = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vmFull.status === "completed") {
      expect(vmFull.muscleVolume?.rows).toEqual(completedCardModel.kind === "completed"
        ? completedCardModel.workingVolume?.rows
        : null);
      expect(vmFull.muscleVolume?.exercisesByMuscleGroup).toEqual(
        completedCardModel.kind === "completed"
          ? completedCardModel.workingVolume?.exercisesByMuscleGroup
          : null,
      );
    }

    const vmNone = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: { ...completedCardModel, workingVolume: null },
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vmNone.status === "completed") expect(vmNone.muscleVolume).toBeNull();
  });

  it("energyDay always equals todayDayKey", () => {
    const vm = buildStrengthTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      actionWorkoutExercises: completedExercises,
      energy: undefined,
    });
    if (vm.status === "completed") expect(vm.energyDay).toBe(TODAY);
  });
});
