import {
  STRENGTH_THIS_WEEK_FOOTER_NO_TODAY,
  STRENGTH_THIS_WEEK_FOOTER_WITH_TODAY,
  buildStrengthLastWeekCardModel,
  buildStrengthThisWeekCardModel,
  formatStrengthLastWeekSessionsMicroCaption,
  formatStrengthThisWeekSessionsMicroCaption,
  formatStrengthThisWeekWorkoutCountLine,
} from "../strengthThisWeekCardModel";
import { strengthWeeklyFrequencyRatingLabelFromBucket } from "@/lib/utils/strengthWeeklyFrequencyRating";

describe("formatStrengthThisWeekWorkoutCountLine", () => {
  it("uses singular for 1 and plural otherwise", () => {
    expect(formatStrengthThisWeekWorkoutCountLine(0)).toBe("0 workouts");
    expect(formatStrengthThisWeekWorkoutCountLine(1)).toBe("1 workout");
    expect(formatStrengthThisWeekWorkoutCountLine(2)).toBe("2 workouts");
    expect(formatStrengthThisWeekWorkoutCountLine(11)).toBe("11 workouts");
  });
});

describe("formatStrengthThisWeekSessionsMicroCaption", () => {
  it("matches session totals with conversational copy", () => {
    expect(formatStrengthThisWeekSessionsMicroCaption(0)).toBe("0 sessions this week");
    expect(formatStrengthThisWeekSessionsMicroCaption(1)).toBe("1 session this week");
    expect(formatStrengthThisWeekSessionsMicroCaption(2)).toBe("2 sessions this week");
  });
});

describe("formatStrengthLastWeekSessionsMicroCaption", () => {
  it("matches session totals with last-week copy", () => {
    expect(formatStrengthLastWeekSessionsMicroCaption(0)).toBe("0 sessions last week");
    expect(formatStrengthLastWeekSessionsMicroCaption(1)).toBe("1 session last week");
    expect(formatStrengthLastWeekSessionsMicroCaption(2)).toBe("2 sessions last week");
  });
});

describe("buildStrengthLastWeekCardModel", () => {
  const today = "2026-03-12" as const;
  /** Prior Sun–Sat when current week anchor is `2026-03-09` … `2026-03-15`. */
  const lastWeekStart = "2026-03-02" as const;
  const lastWeekEnd = "2026-03-08" as const;

  function strengthWorkout(id: string, day: string) {
    return {
      day: day as `${string}-${string}-${string}`,
      workouts: [
        {
          id,
          observedAt: `${day}T10:00:00.000Z`,
          sourceId: "apple_health",
          title: "Lift",
          workoutType: "strength" as const,
          start: `${day}T10:00:00.000Z`,
          end: `${day}T10:30:00.000Z`,
          durationMinutes: 30,
          calories: null,
        },
      ],
    };
  }

  it("counts only strength-tab sessions in the prior calendar week window", () => {
    const days = [
      strengthWorkout("p1", lastWeekStart),
      strengthWorkout("p2", "2026-03-05"),
      strengthWorkout("cur", "2026-03-12"),
    ];
    const m = buildStrengthLastWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      lastWeekStartDay: lastWeekStart,
      lastWeekEndDay: lastWeekEnd,
    });
    expect(m.totalWorkoutsThisWeek).toBe(2);
    expect(m.compactValuePrimary).toBe("2 workouts");
  });

  it("matches This Week ladder for weekly session totals", () => {
    const days = [
      strengthWorkout("a", lastWeekStart),
      strengthWorkout("b", "2026-03-04"),
      strengthWorkout("c", "2026-03-06"),
    ];
    const m = buildStrengthLastWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      lastWeekStartDay: lastWeekStart,
      lastWeekEndDay: lastWeekEnd,
    });
    expect(m.totalWorkoutsThisWeek).toBe(3);
    expect(m.ratingLabel).toBe(strengthWeeklyFrequencyRatingLabelFromBucket(3));
  });
});

describe("buildStrengthThisWeekCardModel", () => {
  const today = "2026-04-04" as const;
  const weekStart = "2026-03-30" as const;
  const weekEnd = "2026-04-05" as const;

  function strengthWorkout(id: string, day: string) {
    return {
      day: day as `${string}-${string}-${string}`,
      workouts: [
        {
          id,
          observedAt: `${day}T10:00:00.000Z`,
          sourceId: "apple_health",
          title: "Lift",
          workoutType: "strength" as const,
          start: `${day}T10:00:00.000Z`,
          end: `${day}T10:30:00.000Z`,
          durationMinutes: 30,
          calories: null,
        },
      ],
    };
  }

  it("shows total workouts for the week, not average/week format", () => {
    const days = [strengthWorkout("a", weekStart)];
    const m = buildStrengthThisWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(m.compactValuePrimary).toBe("1 workout");
    expect(m.totalWorkoutsThisWeek).toBe(1);
    expect(m.compactValuePrimary).not.toMatch(/\/wk$/);
    expect(m.compactValuePrimary).not.toContain(".");
  });

  it("regresses if average/week formatting returned: model must not contain /wk", () => {
    const days = [
      strengthWorkout("a", weekStart),
      strengthWorkout("b", "2026-04-01"),
    ];
    const m = buildStrengthThisWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(JSON.stringify(m)).not.toContain("/wk");
    expect(m.compactValuePrimary).toBe("2 workouts");
  });

  it("maps weekly total to frequency pill and bar fill on 0–7 scale", () => {
    const days = [
      strengthWorkout("id0", weekStart),
      strengthWorkout("id1", "2026-04-01"),
      strengthWorkout("id2", "2026-04-02"),
    ];
    const m = buildStrengthThisWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(m.totalWorkoutsThisWeek).toBe(3);
    expect(m.ratingLabel).toBe(strengthWeeklyFrequencyRatingLabelFromBucket(3));
    expect(m.fillWidth01Override).toBeCloseTo(3 / 7, 10);
  });

  it("includes today’s strength session in total when present in hydrate", () => {
    const days = [strengthWorkout("t", today)];
    const m = buildStrengthThisWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(m.totalWorkoutsThisWeek).toBe(1);
    expect(m.compactValuePrimary).toBe("1 workout");
    expect(m.footerSupportCaption).toBe(STRENGTH_THIS_WEEK_FOOTER_WITH_TODAY);
  });

  it("footer when no workout on today", () => {
    const days = [strengthWorkout("a", weekStart)];
    const m = buildStrengthThisWeekCardModel({
      strengthCalendarDays: days,
      todayDayKey: today,
      weekStartDay: weekStart,
      weekEndDay: weekEnd,
    });
    expect(m.footerSupportCaption).toBe(STRENGTH_THIS_WEEK_FOOTER_NO_TODAY);
  });
});
