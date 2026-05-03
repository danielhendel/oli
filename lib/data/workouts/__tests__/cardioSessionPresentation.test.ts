import type { ReconciledWorkoutSession } from "@/lib/data/workouts/workoutSessionReconciliation";
import {
  cardioDistanceTierFromWeeklyMiles,
  cardioDistanceTierIndexForBar,
  cardioDistanceTierLabel,
  cardioModalityLabelFromWorkout,
  filterCardioHistoryRowsDedupeOverlappingOther,
  formatCardioWeeklyDistanceAndMinutes,
  formatCardioSessionHeadline,
  formatCardioSessionSubtitle,
  formatThisWeekCardioDistanceSummary,
  getThisWeekCardioSessions,
  isDisplayableCardioHistorySession,
  pickRepresentativeWorkoutForCardioModality,
  sessionsHaveOverlappingTimeWindows,
  sumDisplayableCardioDistanceMilesForWeekEntries,
} from "@/lib/data/workouts/cardioSessionPresentation";
import { activityStepTierBarVisual } from "@/lib/utils/activityStepTierVisual";

function cardioSession(
  id: string,
  day: `${string}-${string}-${string}`,
  opts: { title?: string; distanceMeters?: number; durationMinutes?: number; hkActivityId?: number },
): ReconciledWorkoutSession {
  return {
    id,
    day,
    sessionType: "cardio",
    title: opts.title ?? "Workout",
    titleSource: "provider",
    start: `${day}T10:00:00.000Z`,
    end: `${day}T10:30:00.000Z`,
    durationMinutes: opts.durationMinutes ?? null,
    calories: null,
    sourceSummaries: [],
    sourceCount: 1,
    workouts: [
      {
        id: `${id}-w`,
        observedAt: `${day}T10:00:00.000Z`,
        sourceId: "apple_health",
        title: opts.title ?? "Workout",
        workoutType: "cardio",
        start: `${day}T10:00:00.000Z`,
        end: `${day}T10:30:00.000Z`,
        durationMinutes: opts.durationMinutes ?? null,
        calories: null,
        ...(opts.distanceMeters != null ? { distanceMeters: opts.distanceMeters } : {}),
        ...(opts.hkActivityId != null
          ? { hk: { sourceId: "healthkit", activityId: opts.hkActivityId } }
          : {}),
      },
    ],
  };
}

describe("cardioSessionPresentation", () => {
  it("formats headline as distance and duration when both are present", () => {
    expect(
      formatCardioSessionHeadline({
        distanceMeters: 3.08 * 1609.344,
        durationMinutes: 31,
      }),
    ).toBe("3.08 mi / 31 min");
  });

  it("handles missing distance/duration fallbacks without undefined", () => {
    expect(formatCardioSessionHeadline({ distanceMeters: null, durationMinutes: 31 })).toBe("31 min");
    expect(formatCardioSessionHeadline({ distanceMeters: 3.08 * 1609.344, durationMinutes: null })).toBe("3.08 mi");
    expect(formatCardioSessionHeadline({ distanceMeters: null, durationMinutes: null })).toBe("—");
  });

  it("formats cardio subtitle from type-like session naming", () => {
    const session = cardioSession("s1", "2026-04-28", { title: "Walking", distanceMeters: 1609.344 });
    expect(formatCardioSessionSubtitle(session)).toBe("Walking");
  });

  it("maps HK Walking activity id over misleading Other strings", () => {
    const session = cardioSession("s1", "2026-04-28", {
      title: "Other",
      hkActivityId: 52,
      distanceMeters: 4956,
    });
    expect(formatCardioSessionSubtitle(session)).toBe("Walking");
  });

  it("lists all this-week sessions Sun→Sat and excludes mixed + junk Other", () => {
    const entries = [
      { day: "2026-04-28" as const, session: cardioSession("a", "2026-04-28", { title: "Run" }) },
      { day: "2026-04-26" as const, session: cardioSession("sun", "2026-04-26", { title: "Walking" }) },
      {
        day: "2026-04-27" as const,
        session: { ...cardioSession("b", "2026-04-27", { title: "Walk" }), sessionType: "mixed" as const },
      },
      { day: "2026-04-29" as const, session: cardioSession("other", "2026-04-29", { title: "Other", hkActivityId: 3000 }) },
      { day: "2026-04-30" as const, session: cardioSession("c", "2026-04-30", { title: "Cycle" }) },
      { day: "2026-04-25" as const, session: cardioSession("d", "2026-04-25", { title: "Run" }) },
    ];
    const weekDays = [
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ] as const;
    const out = getThisWeekCardioSessions(entries, weekDays);
    expect(out).toHaveLength(3);
    expect(out.map((e) => e.session.id)).toEqual(["sun", "a", "c"]);
  });

  it("Sun–Wed sessions appear in calendar order with no row cap", () => {
    const entries = [
      { day: "2026-04-26" as const, session: cardioSession("sun", "2026-04-26", { title: "Walking", distanceMeters: 1609 }) },
      { day: "2026-04-27" as const, session: cardioSession("mon", "2026-04-27", { title: "Running", distanceMeters: 3218 }) },
      { day: "2026-04-28" as const, session: cardioSession("tue", "2026-04-28", { title: "Walking", distanceMeters: 4956 }) },
      { day: "2026-04-29" as const, session: cardioSession("wed", "2026-04-29", { title: "Walking", distanceMeters: 1609 }) },
    ];
    const weekDays = [
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ] as const;
    const out = getThisWeekCardioSessions(entries, weekDays);
    expect(out).toHaveLength(4);
    expect(out.map((e) => e.session.id)).toEqual(["sun", "mon", "tue", "wed"]);
  });

  it("weekly mileage sum matches every displayable session in the slice (same set as This Week list)", () => {
    const entries = [
      { day: "2026-04-26" as const, session: cardioSession("sun", "2026-04-26", { title: "Walking", distanceMeters: 1609 }) },
      { day: "2026-04-27" as const, session: cardioSession("mon", "2026-04-27", { title: "Running", distanceMeters: 1609 }) },
      { day: "2026-04-28" as const, session: cardioSession("tue", "2026-04-28", { title: "Walking", distanceMeters: 1609 }) },
      { day: "2026-04-29" as const, session: cardioSession("wed", "2026-04-29", { title: "Walking", distanceMeters: 1609 }) },
    ];
    const weekDays = [
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
      "2026-04-30",
      "2026-05-01",
      "2026-05-02",
    ] as const;
    expect(sumDisplayableCardioDistanceMilesForWeekEntries(entries)).toBeCloseTo(4, 0);
    const listed = getThisWeekCardioSessions(entries, weekDays);
    expect(listed).toHaveLength(4);
    expect(listed.map((e) => e.session.id)).toEqual(["sun", "mon", "tue", "wed"]);
  });

  it("isDisplayableCardioHistorySession hides generic Other without distance", () => {
    const junk = cardioSession("j", "2026-04-29", { title: "Other", hkActivityId: 3000, durationMinutes: 39 });
    expect(isDisplayableCardioHistorySession(junk)).toBe(false);
    const ok = cardioSession("w", "2026-04-29", { title: "Walking", distanceMeters: 1609 });
    expect(isDisplayableCardioHistorySession(ok)).toBe(true);
  });

  it("filterCardioHistoryRowsDedupeOverlappingOther removes overlapping duration-only Other when Walking has distance", () => {
    const walk = cardioSession("walk", "2026-04-28", {
      title: "Walking",
      hkActivityId: 52,
      distanceMeters: 4956,
      durationMinutes: 31,
    });
    walk.start = "2026-04-28T14:00:00.000Z";
    walk.end = "2026-04-28T14:31:00.000Z";
    walk.workouts[0]!.start = walk.start;
    walk.workouts[0]!.end = walk.end;

    const otherDup = cardioSession("other", "2026-04-28", {
      title: "Other",
      hkActivityId: 3000,
      durationMinutes: 39,
    });
    otherDup.start = "2026-04-28T14:00:00.000Z";
    otherDup.end = "2026-04-28T14:39:00.000Z";
    otherDup.workouts[0]!.start = otherDup.start;
    otherDup.workouts[0]!.end = otherDup.end;

    const rows = filterCardioHistoryRowsDedupeOverlappingOther([
      { day: "2026-04-28", session: walk },
      { day: "2026-04-28", session: otherDup },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.session.id).toBe("walk");
  });

  it("sessionsHaveOverlappingTimeWindows detects same-window workouts", () => {
    const a = cardioSession("a", "2026-04-28", { title: "Running", durationMinutes: 30 });
    const b = cardioSession("b", "2026-04-28", { title: "Running", durationMinutes: 30 });
    expect(sessionsHaveOverlappingTimeWindows(a, b)).toBe(true);
  });

  it("maps six-tier weekly mileage ladder including Peak (palette index 5 / Strength Peak)", () => {
    expect(cardioDistanceTierFromWeeklyMiles(2.4)).toBe("very_low");
    expect(cardioDistanceTierFromWeeklyMiles(2.5)).toBe("low");
    expect(cardioDistanceTierFromWeeklyMiles(3.2)).toBe("low");
    expect(cardioDistanceTierFromWeeklyMiles(7.5)).toBe("active");
    expect(cardioDistanceTierFromWeeklyMiles(10.6)).toBe("active");
    expect(cardioDistanceTierFromWeeklyMiles(15)).toBe("high");
    expect(cardioDistanceTierFromWeeklyMiles(25)).toBe("very_high");
    expect(cardioDistanceTierFromWeeklyMiles(39)).toBe("very_high");
    expect(cardioDistanceTierFromWeeklyMiles(40)).toBe("peak");
    expect(cardioDistanceTierLabel("peak")).toBe("Peak");
    expect(cardioDistanceTierIndexForBar("peak")).toBe(5);
    const peakBar = activityStepTierBarVisual(cardioDistanceTierIndexForBar("peak"));
    const strengthPeakBand = activityStepTierBarVisual(5);
    expect(peakBar?.fillColor).toBe(strengthPeakBand?.fillColor);
  });

  it("uses HK Running (37) over Walking (52) when both are present; distance only tie-breaks within the same HK family", () => {
    const base = cardioSession("mix", "2026-05-02", { title: "Cardio" });
    base.workouts = [
      {
        ...base.workouts[0]!,
        id: "w1",
        distanceMeters: 500,
        hk: { sourceId: "healthkit", activityId: 52 },
        title: "Walking",
        activityName: "Walking",
      },
      {
        ...base.workouts[0]!,
        id: "w2",
        observedAt: "2026-05-02T11:00:00.000Z",
        start: "2026-05-02T11:00:00.000Z",
        end: "2026-05-02T11:30:00.000Z",
        distanceMeters: 8000,
        hk: { sourceId: "healthkit", activityId: 37 },
        title: "Running",
        activityName: "Running",
      },
    ];
    expect(formatCardioSessionSubtitle(base)).toBe("Running");
  });

  /**
   * Audit (presentation bug): merged reconciled sessions for the same calendar day can contain both
   * a stray GPS Walking sample (`activityId` 52, higher distance) and the Watch cardio row for Indoor Run,
   * which uses Apple’s **same** HK enum as outdoor Running (`activityId` 37 — indoor vs outdoor is not a separate id).
   * Old logic picked max distance → Walking. Resolver must prefer HK Running family before distance.
   */
  it("prefers HK Running (37) over HK Walking (52) even when Walking has far more distance (Indoor Run merge)", () => {
    const base = cardioSession("merge-428", "2026-04-28", { title: "Cardio" });
    base.workouts = [
      {
        ...base.workouts[0]!,
        id: "gps-walking-noisy",
        distanceMeters: 20_000,
        hk: { sourceId: "healthkit", activityId: 52 },
        title: "Walking",
        activityName: "Walking",
      },
      {
        ...base.workouts[0]!,
        id: "indoor-run-watch",
        observedAt: "2026-04-28T12:00:00.000Z",
        start: "2026-04-28T12:00:00.000Z",
        end: "2026-04-28T12:35:00.000Z",
        distanceMeters: 1609,
        hk: { sourceId: "healthkit", activityId: 37 },
        title: "Running",
        activityName: "Running",
      },
    ];
    expect(formatCardioSessionSubtitle(base)).toBe("Running");
  });

  it("matches Today + This Week: formatCardioSessionSubtitle uses pickRepresentativeWorkoutForCardioModality", () => {
    const base = cardioSession("parity", "2026-04-29", { title: "Cardio" });
    base.workouts = [
      {
        ...base.workouts[0]!,
        id: "w",
        distanceMeters: 50_000,
        hk: { sourceId: "healthkit", activityId: 52 },
      },
      {
        ...base.workouts[0]!,
        id: "r",
        distanceMeters: 100,
        hk: { sourceId: "healthkit", activityId: 37 },
      },
    ];
    const rep = pickRepresentativeWorkoutForCardioModality(base);
    expect(rep?.id).toBe("r");
    expect(formatCardioSessionSubtitle(base)).toBe(cardioModalityLabelFromWorkout(rep!));
  });

  it("shows Walking when HealthKit walking is the distance-primary segment", () => {
    const s = cardioSession("w52", "2026-05-02", {
      title: "Walking",
      hkActivityId: 52,
      distanceMeters: 1.33 * 1609.344,
      durationMinutes: 26,
    });
    expect(formatCardioSessionSubtitle(s)).toBe("Walking");
  });

  it("formats this-week summary in miles", () => {
    expect(formatThisWeekCardioDistanceSummary(5.84)).toBe("5.8 mi this week");
  });

  it("formats weekly distance and minutes with fallbacks", () => {
    expect(
      formatCardioWeeklyDistanceAndMinutes({
        averageMilesPerWeek: 2.9,
        averageMinutesPerWeek: 44.2,
      }),
    ).toBe("2.9 mi · 44 min/wk");
    expect(
      formatCardioWeeklyDistanceAndMinutes({
        averageMilesPerWeek: null,
        averageMinutesPerWeek: 44.2,
      }),
    ).toBe("44 min/wk");
    expect(
      formatCardioWeeklyDistanceAndMinutes({
        averageMilesPerWeek: 2.9,
        averageMinutesPerWeek: null,
      }),
    ).toBe("2.9 mi/wk");
    expect(
      formatCardioWeeklyDistanceAndMinutes({
        averageMilesPerWeek: null,
        averageMinutesPerWeek: null,
      }),
    ).toBe("—");
  });
});
