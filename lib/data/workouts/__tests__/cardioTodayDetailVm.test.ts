import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import type { CardioTodayCardModel } from "@/lib/data/workouts/cardioTodayCardModel";
import {
  CARDIO_TODAY_DETAIL_METRIC_LABELS,
  CARDIO_TODAY_DETAIL_MISSING_VALUE,
  buildCardioTodayDetailVm,
  formatCardioTodayAvgHeartRateValue,
  formatCardioTodayCalorieValue,
  formatCardioTodayDistanceValue,
  formatCardioTodayPaceValue,
  listTodayCardioSessionsForDetailVm,
} from "@/lib/data/workouts/cardioTodayDetailVm";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { WorkoutHistoryItem } from "@/lib/data/workouts/parseWorkoutFromRawEvent";

const TODAY = "2026-05-26" as DayKey;

function cardioWorkout(opts: {
  id: string;
  startIso: string;
  endIso: string;
  durationMinutes: number;
  distanceMeters?: number | null;
  activityId?: number | null;
  activityName?: string;
}): WorkoutHistoryItem {
  return {
    id: opts.id,
    observedAt: opts.startIso,
    sourceId: "apple_health",
    title: opts.activityName ?? "Running",
    workoutType: "cardio",
    start: opts.startIso,
    end: opts.endIso,
    durationMinutes: opts.durationMinutes,
    calories: null,
    ...(opts.distanceMeters != null ? { distanceMeters: opts.distanceMeters } : {}),
    activityName: opts.activityName ?? "Running",
    hk: { sourceId: "healthkit", activityId: opts.activityId ?? 37 },
  };
}

const completedCardModel: CardioTodayCardModel = {
  kind: "completed",
  pill: "Completed",
  sessions: [
    { sessionId: "s1", primaryLine: "3.13 mi", metaLine: "Running · 35 min" },
  ],
};

const restCardModel: CardioTodayCardModel = {
  kind: "rest",
  pill: "No Cardio",
  primaryTitle: "No cardio today",
  subtitle: "Log a session when you train",
};

function energy(opts: {
  cardio?: {
    averageHeartRateBpm?: number;
    paceMinPerKm?: number;
  };
  factorCardio?: { kcalLow?: number; kcalHigh?: number; kcal?: number };
} = {}): DailyEnergyCardDto {
  return {
    modelVersion: "v1",
    computedAt: "2026-05-26T00:00:00.000Z",
    day: TODAY,
    estimatedKcal: { low: 1700, high: 2300, midpoint: 2000 },
    variancePct: 0.1,
    confidence: "moderate",
    factors: {
      baseline: { kcalLow: 1500, kcalHigh: 1700 },
      ...(opts.factorCardio
        ? { cardio: opts.factorCardio }
        : {}),
    },
    missingRequiredInputs: [],
    energyInfluencers: {
      ...(opts.cardio
        ? { cardio: opts.cardio }
        : {}),
    },
  };
}

describe("formatCardioTodayDistanceValue", () => {
  it("formats positive miles to 2dp", () => {
    expect(formatCardioTodayDistanceValue(3.1337)).toBe("3.13 mi");
  });
  it("returns missing glyph for null / 0 / negative / NaN", () => {
    expect(formatCardioTodayDistanceValue(null)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayDistanceValue(0)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayDistanceValue(-1)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayDistanceValue(Number.NaN)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });
});

describe("formatCardioTodayAvgHeartRateValue", () => {
  it("rounds + formats positive values", () => {
    expect(formatCardioTodayAvgHeartRateValue(142.4)).toBe("142 bpm");
    expect(formatCardioTodayAvgHeartRateValue(142.6)).toBe("143 bpm");
  });
  it("returns missing glyph for non-positive / missing values", () => {
    expect(formatCardioTodayAvgHeartRateValue(undefined)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayAvgHeartRateValue(null)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayAvgHeartRateValue(0)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayAvgHeartRateValue(-10)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });
});

describe("formatCardioTodayPaceValue", () => {
  it("converts paceMinPerKm to min:ss/mi (presentation-only)", () => {
    // 6 min/km × 1.609344 km/mi = 9.65604 min/mi = 9:39/mi (round 39.36→39)
    expect(formatCardioTodayPaceValue(6)).toBe("9:39/mi");
  });
  it("uses two-digit seconds with leading zero", () => {
    // 5 min/km × 1.609344 = 8.0467 min/mi → 8:03/mi
    expect(formatCardioTodayPaceValue(5)).toBe("8:03/mi");
  });
  it("returns missing glyph for non-positive / missing values", () => {
    expect(formatCardioTodayPaceValue(null)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayPaceValue(undefined)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayPaceValue(0)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(formatCardioTodayPaceValue(-3)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });
});

describe("formatCardioTodayCalorieValue", () => {
  it("reuses the Daily Energy additive formatter when kcalLow/High present", () => {
    expect(formatCardioTodayCalorieValue({ kcalLow: 120, kcalHigh: 180 })).toBe("+120\u2013180 kcal");
  });
  it("formats kcal scalar when range absent", () => {
    expect(formatCardioTodayCalorieValue({ kcal: 150 })).toBe("+150 kcal");
  });
  it("returns missing glyph when factor is undefined", () => {
    expect(formatCardioTodayCalorieValue(undefined)).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });
});

describe("buildCardioTodayDetailVm", () => {
  it("returns rest when cardModel is rest (no metric rows)", () => {
    const vm = buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: restCardModel,
      todayCardioSessions: [],
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      energy: undefined,
    });
    expect(vm.status).toBe("rest");
    if (vm.status === "rest") {
      expect(vm.hero).toBe("No cardio today");
      expect(vm.subtitleLine).toBe("Log a session when you train");
    }
  });

  it("returns rest when there are no cardio sessions today even if cardModel says completed", () => {
    const vm = buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      todayCardioSessions: [],
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      energy: undefined,
    });
    expect(vm.status).toBe("rest");
  });

  function buildCompletedVmFixture(opts: {
    multi?: boolean;
    energy?: DailyEnergyCardDto;
  } = {}) {
    const workouts: WorkoutHistoryItem[] = [
      cardioWorkout({
        id: "w-run",
        startIso: "2026-05-26T13:00:00.000Z",
        endIso: "2026-05-26T13:35:00.000Z",
        durationMinutes: 35,
        distanceMeters: 5 * 1609.344,
        activityId: 37,
        activityName: "Running",
      }),
    ];
    if (opts.multi) {
      workouts.push(
        cardioWorkout({
          id: "w-walk",
          startIso: "2026-05-26T18:00:00.000Z",
          endIso: "2026-05-26T18:20:00.000Z",
          durationMinutes: 20,
          distanceMeters: 1.5 * 1609.344,
          activityId: 52,
          activityName: "Walking",
        }),
      );
    }
    const sessions = reconcileWorkoutSessionsForDay(TODAY, workouts);
    const todayCardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    return buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      todayCardioSessions,
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      energy: opts.energy,
    });
  }

  it("hero uses the Apple Health modality label of the best representative cardio session", () => {
    const vm = buildCompletedVmFixture();
    expect(vm.status).toBe("completed");
    if (vm.status !== "completed") return;
    expect(vm.hero).toBe("Running");
  });

  it("hero prefers Running over Walking even when Walking has more distance", () => {
    const workouts: WorkoutHistoryItem[] = [
      cardioWorkout({
        id: "w-walk",
        startIso: "2026-05-26T07:00:00.000Z",
        endIso: "2026-05-26T08:30:00.000Z",
        durationMinutes: 90,
        distanceMeters: 6 * 1609.344,
        activityId: 52,
        activityName: "Walking",
      }),
      cardioWorkout({
        id: "w-run",
        startIso: "2026-05-26T18:00:00.000Z",
        endIso: "2026-05-26T18:25:00.000Z",
        durationMinutes: 25,
        distanceMeters: 3 * 1609.344,
        activityId: 37,
        activityName: "Running",
      }),
    ];
    const sessions = reconcileWorkoutSessionsForDay(TODAY, workouts);
    const todayCardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    const vm = buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      todayCardioSessions,
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      energy: undefined,
    });
    if (vm.status !== "completed") throw new Error("expected completed");
    expect(vm.hero).toBe("Running");
    expect(vm.subtitleLine).toBe("+1 more session");
  });

  it("hero surfaces the Apple Watch richer label (Outdoor Run) over the generic family", () => {
    const workouts: WorkoutHistoryItem[] = [
      cardioWorkout({
        id: "w-outdoor",
        startIso: "2026-05-26T13:00:00.000Z",
        endIso: "2026-05-26T13:35:00.000Z",
        durationMinutes: 35,
        distanceMeters: 5 * 1609.344,
        activityId: 37,
        activityName: "Outdoor Run",
      }),
    ];
    const sessions = reconcileWorkoutSessionsForDay(TODAY, workouts);
    const todayCardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    const vm = buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      todayCardioSessions,
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      energy: undefined,
    });
    if (vm.status !== "completed") throw new Error("expected completed");
    expect(vm.hero).toBe("Outdoor Run");
  });

  it("hero uses durable / server title override when present", () => {
    const workouts: WorkoutHistoryItem[] = [
      cardioWorkout({
        id: "w-run-renamed",
        startIso: "2026-05-26T13:00:00.000Z",
        endIso: "2026-05-26T13:35:00.000Z",
        durationMinutes: 35,
        distanceMeters: 5 * 1609.344,
        activityId: 37,
        activityName: "Outdoor Run",
      }),
    ];
    const sessions = reconcileWorkoutSessionsForDay(TODAY, workouts);
    const todayCardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    const vm = buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      todayCardioSessions,
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: { "w-run-renamed": "Sunset Loop" },
      energy: undefined,
    });
    if (vm.status !== "completed") throw new Error("expected completed");
    expect(vm.hero).toBe("Sunset Loop");
  });

  it("hero uses AsyncStorage customTitle override when no durable title is present", () => {
    const workouts: WorkoutHistoryItem[] = [
      cardioWorkout({
        id: "w-async-renamed",
        startIso: "2026-05-26T13:00:00.000Z",
        endIso: "2026-05-26T13:35:00.000Z",
        durationMinutes: 35,
        distanceMeters: 5 * 1609.344,
        activityId: 37,
        activityName: "Running",
      }),
    ];
    const sessions = reconcileWorkoutSessionsForDay(TODAY, workouts);
    const todayCardioSessions = listTodayCardioSessionsForDetailVm(sessions);
    const vm = buildCardioTodayDetailVm({
      todayDayKey: TODAY,
      cardModel: completedCardModel,
      todayCardioSessions,
      overridesByWorkoutId: {
        "w-async-renamed": {
          workoutId: "w-async-renamed",
          customTitle: "Trail Recovery",
          updatedAt: "2026-05-26T14:00:00.000Z",
        },
      },
      durableTitlesByWorkoutId: {},
      energy: undefined,
    });
    if (vm.status !== "completed") throw new Error("expected completed");
    expect(vm.hero).toBe("Trail Recovery");
  });

  it("emits the exact 6-row ordered metric list (Duration → … → Estimated Calories)", () => {
    const vm = buildCompletedVmFixture();
    if (vm.status !== "completed") throw new Error("expected completed");
    expect(vm.rows.map((r) => r.id)).toEqual([
      "duration",
      "distance",
      "avgCadence",
      "avgPace",
      "avgHeartRate",
      "estimatedCalories",
    ]);
    expect(vm.rows.map((r) => r.label)).toEqual([
      CARDIO_TODAY_DETAIL_METRIC_LABELS.duration,
      CARDIO_TODAY_DETAIL_METRIC_LABELS.distance,
      CARDIO_TODAY_DETAIL_METRIC_LABELS.avgCadence,
      CARDIO_TODAY_DETAIL_METRIC_LABELS.avgPace,
      CARDIO_TODAY_DETAIL_METRIC_LABELS.avgHeartRate,
      CARDIO_TODAY_DETAIL_METRIC_LABELS.estimatedCalories,
    ]);
  });

  it("duration and distance reflect the single session", () => {
    const vm = buildCompletedVmFixture();
    if (vm.status !== "completed") throw new Error("expected completed");
    const byId = Object.fromEntries(vm.rows.map((r) => [r.id, r.value]));
    expect(byId.duration).toBe("35 min");
    expect(byId.distance).toBe("5.00 mi");
  });

  it("duration and distance sum across multi-session today; subtitleLine reports more sessions", () => {
    const vm = buildCompletedVmFixture({ multi: true });
    if (vm.status !== "completed") throw new Error("expected completed");
    const byId = Object.fromEntries(vm.rows.map((r) => [r.id, r.value]));
    expect(byId.duration).toBe("55 min");
    expect(byId.distance).toBe("6.50 mi");
    expect(vm.subtitleLine).toBe("+1 more session");
  });

  it("cadence is always '—' (no client estimation)", () => {
    const vm = buildCompletedVmFixture({
      energy: energy({
        cardio: { averageHeartRateBpm: 142, paceMinPerKm: 6 },
        factorCardio: { kcalLow: 100, kcalHigh: 150 },
      }),
    });
    if (vm.status !== "completed") throw new Error("expected completed");
    expect(vm.rows[2]!.value).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });

  it("pace, HR, calories pull from canonical energy fields", () => {
    const vm = buildCompletedVmFixture({
      energy: energy({
        cardio: { averageHeartRateBpm: 142, paceMinPerKm: 6 },
        factorCardio: { kcalLow: 110, kcalHigh: 185 },
      }),
    });
    if (vm.status !== "completed") throw new Error("expected completed");
    const byId = Object.fromEntries(vm.rows.map((r) => [r.id, r.value]));
    expect(byId.avgPace).toBe("9:39/mi");
    expect(byId.avgHeartRate).toBe("142 bpm");
    expect(byId.estimatedCalories).toBe("+110\u2013185 kcal");
  });

  it("missing canonical pace/HR/calories render '—' without fabrication", () => {
    const vm = buildCompletedVmFixture({ energy: energy() });
    if (vm.status !== "completed") throw new Error("expected completed");
    const byId = Object.fromEntries(vm.rows.map((r) => [r.id, r.value]));
    expect(byId.avgPace).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(byId.avgHeartRate).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(byId.estimatedCalories).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });

  it("loading state: energy=undefined keeps pace/HR/calories as '—'", () => {
    const vm = buildCompletedVmFixture({ energy: undefined });
    if (vm.status !== "completed") throw new Error("expected completed");
    const byId = Object.fromEntries(vm.rows.map((r) => [r.id, r.value]));
    expect(byId.avgPace).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(byId.avgHeartRate).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    expect(byId.estimatedCalories).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
  });

  // Workout Physiology v1 — Phase C: Avg Heart Rate row becomes tappable when avg HR
  // or zones exist. Mirrors the Strength VM tappable contract.
  describe("Phase C tappable Avg Heart Rate row", () => {
    function avgHrRow(vm: ReturnType<typeof buildCardioTodayDetailVm>) {
      if (vm.status !== "completed") throw new Error("expected completed");
      const r = vm.rows.find((row) => row.id === "avgHeartRate");
      if (r == null) throw new Error("avgHeartRate row missing");
      return r;
    }

    it("does NOT mark avgHeartRate tappable when neither avg HR nor zones exist", () => {
      const vm = buildCompletedVmFixture({ energy: energy() });
      expect(avgHrRow(vm).tappable).toBeUndefined();
    });

    it("marks avgHeartRate tappable when averageHeartRateBpm exists (even without zones)", () => {
      const vm = buildCompletedVmFixture({
        energy: energy({ cardio: { averageHeartRateBpm: 142 } }),
      });
      expect(avgHrRow(vm).tappable).toBe(true);
    });

    it("marks avgHeartRate tappable when heartRateZoneMinutes exist (even without avg HR)", () => {
      const energyWithZonesOnly: DailyEnergyCardDto = {
        modelVersion: "v1",
        computedAt: "2026-05-26T00:00:00.000Z",
        day: TODAY,
        estimatedKcal: { low: 1700, high: 2300, midpoint: 2000 },
        variancePct: 0.1,
        confidence: "moderate",
        factors: {},
        missingRequiredInputs: [],
        energyInfluencers: {
          cardio: {
            heartRateZoneMinutes: [1, 2, 3, 4, 5] as const,
          },
        },
      };
      const vm = buildCompletedVmFixture({ energy: energyWithZonesOnly });
      expect(avgHrRow(vm).tappable).toBe(true);
    });

    it("exposes energyDay on the completed VM (verbatim) so the modal can re-fetch by day", () => {
      const vm = buildCompletedVmFixture({
        energy: energy({ cardio: { averageHeartRateBpm: 142 } }),
      });
      if (vm.status !== "completed") throw new Error("expected completed");
      expect(vm.energyDay).toBe(TODAY);
    });

    it("keeps cadence as '—' regardless of Phase C HR-zone availability (no fabrication)", () => {
      const energyWithZones: DailyEnergyCardDto = {
        modelVersion: "v1",
        computedAt: "2026-05-26T00:00:00.000Z",
        day: TODAY,
        estimatedKcal: { low: 1700, high: 2300, midpoint: 2000 },
        variancePct: 0.1,
        confidence: "moderate",
        factors: {},
        missingRequiredInputs: [],
        energyInfluencers: {
          cardio: {
            averageHeartRateBpm: 142,
            heartRateZoneMinutes: [3, 8, 12, 4, 1] as const,
          },
        },
      };
      const vm = buildCompletedVmFixture({ energy: energyWithZones });
      if (vm.status !== "completed") throw new Error("expected completed");
      const cadence = vm.rows.find((r) => r.id === "avgCadence");
      expect(cadence?.value).toBe(CARDIO_TODAY_DETAIL_MISSING_VALUE);
    });
  });
});
