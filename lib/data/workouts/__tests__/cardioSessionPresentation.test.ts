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
  pickBestRepresentativeCardioSessionForDay,
  pickRepresentativeWorkoutForCardioModality,
  resolveCardioSessionDisplayName,
  sessionsHaveOverlappingTimeWindows,
  sumDisplayableCardioDistanceMilesForWeekEntries,
} from "@/lib/data/workouts/cardioSessionPresentation";
import { filterWorkoutHistoryItemsForDomain } from "@/lib/data/workouts/workoutDomain";
import { reconcileWorkoutSessionsForDay } from "@/lib/data/workouts/workoutSessionReconciliation";
import { activityStepTierBarVisual } from "@/lib/utils/activityStepTierVisual";

function cardioSession(
  id: string,
  day: `${string}-${string}-${string}`,
  opts: {
    title?: string;
    distanceMeters?: number;
    durationMinutes?: number;
    hkActivityId?: number;
    activityName?: string;
    startIso?: string;
    endIso?: string;
  },
): ReconciledWorkoutSession {
  const startIso = opts.startIso ?? `${day}T10:00:00.000Z`;
  const endIso = opts.endIso ?? `${day}T10:30:00.000Z`;
  return {
    id,
    day,
    sessionType: "cardio",
    title: opts.title ?? "Workout",
    titleSource: "provider",
    start: startIso,
    end: endIso,
    durationMinutes: opts.durationMinutes ?? null,
    calories: null,
    sourceSummaries: [],
    sourceCount: 1,
    workouts: [
      {
        id: `${id}-w`,
        observedAt: startIso,
        sourceId: "apple_health",
        title: opts.title ?? "Workout",
        workoutType: "cardio",
        start: startIso,
        end: endIso,
        durationMinutes: opts.durationMinutes ?? null,
        calories: null,
        ...(opts.distanceMeters != null ? { distanceMeters: opts.distanceMeters } : {}),
        ...(opts.activityName != null ? { activityName: opts.activityName } : {}),
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

  it("uses the same cardio inclusion outcome as domain filtering for Other-without-distance", () => {
    const day = "2026-05-04" as const;
    const cardioCandidate = {
      id: "apple-other",
      observedAt: "2026-05-04T08:46:05.000-0400",
      sourceId: "healthkit",
      title: "Other",
      sport: "Other",
      activityName: "Other",
      start: "2026-05-04T08:46:05.000-0400",
      end: "2026-05-04T09:44:39.000-0400",
      durationMinutes: 59,
      calories: 354,
      hk: { sourceId: "com.myzonemoves.app.MYZONE", activityId: 3000 },
      workoutType: undefined,
      distanceMeters: null,
    };
    const domainFiltered = filterWorkoutHistoryItemsForDomain([cardioCandidate], "cardio");
    expect(domainFiltered).toHaveLength(0);

    const sessions = reconcileWorkoutSessionsForDay(day, domainFiltered);
    const thisWeekRows = getThisWeekCardioSessions(
      sessions.map((session) => ({ day, session })),
      [
        "2026-05-03",
        "2026-05-04",
        "2026-05-05",
        "2026-05-06",
        "2026-05-07",
        "2026-05-08",
        "2026-05-09",
      ],
    );
    expect(thisWeekRows).toHaveLength(0);
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

  describe("cardioModalityLabelFromWorkout — Apple Watch richer labels", () => {
    it("preserves 'Outdoor Run' from activityName instead of collapsing HK family to 'Running'", () => {
      const session = cardioSession("outdoor-run", "2026-05-28", {
        title: "Outdoor Run",
        activityName: "Outdoor Run",
        hkActivityId: 37,
        distanceMeters: 5_000,
      });
      expect(formatCardioSessionSubtitle(session)).toBe("Outdoor Run");
    });

    it("preserves 'Indoor Run' over HK Running family collapse", () => {
      const session = cardioSession("indoor-run", "2026-05-28", {
        title: "Indoor Run",
        activityName: "Indoor Run",
        hkActivityId: 37,
        distanceMeters: 0,
      });
      expect(formatCardioSessionSubtitle(session)).toBe("Indoor Run");
    });

    it("preserves 'Outdoor Walk' over HK Walking family collapse", () => {
      const session = cardioSession("outdoor-walk", "2026-05-28", {
        title: "Outdoor Walk",
        activityName: "Outdoor Walk",
        hkActivityId: 52,
        distanceMeters: 2_000,
      });
      expect(formatCardioSessionSubtitle(session)).toBe("Outdoor Walk");
    });

    it("falls back to 'Running' when activityName is the generic 'Running'", () => {
      const session = cardioSession("plain-run", "2026-05-28", {
        title: "Running",
        activityName: "Running",
        hkActivityId: 37,
      });
      expect(formatCardioSessionSubtitle(session)).toBe("Running");
    });

    it("falls back to 'Walking' when activityName is the generic 'Walking'", () => {
      const session = cardioSession("plain-walk", "2026-05-28", {
        title: "Walking",
        activityName: "Walking",
        hkActivityId: 52,
      });
      expect(formatCardioSessionSubtitle(session)).toBe("Walking");
    });

    it("ignores arbitrary user text on title (only qualifier+sport patterns qualify as rich)", () => {
      const session = cardioSession("custom", "2026-05-28", {
        title: "Morning Loop",
        activityName: "Running",
        hkActivityId: 37,
      });
      expect(formatCardioSessionSubtitle(session)).toBe("Running");
    });

    it("preserves richer label sourced from title when activityName is missing", () => {
      const session = cardioSession("title-only", "2026-05-28", {
        title: "Indoor Cycle",
        hkActivityId: 13,
      });
      // `formatWorkoutTitle` normalizes "Indoor Cycle" → "Indoor Cycling" via the well-known
      // override table; the qualifier-prefixed richer label is preserved either way.
      expect(formatCardioSessionSubtitle(session)).toBe("Indoor Cycling");
    });
  });

  describe("pickBestRepresentativeCardioSessionForDay", () => {
    it("prefers Running family over Walking family even when Walking has more distance", () => {
      const walkBig = cardioSession("walk-big", "2026-05-28", {
        title: "Walking",
        activityName: "Walking",
        hkActivityId: 52,
        distanceMeters: 10_000,
        startIso: "2026-05-28T08:00:00.000Z",
        endIso: "2026-05-28T09:30:00.000Z",
      });
      const runSmall = cardioSession("run-small", "2026-05-28", {
        title: "Running",
        activityName: "Running",
        hkActivityId: 37,
        distanceMeters: 2_000,
        startIso: "2026-05-28T18:00:00.000Z",
        endIso: "2026-05-28T18:20:00.000Z",
      });
      expect(pickBestRepresentativeCardioSessionForDay([walkBig, runSmall])?.id).toBe("run-small");
    });

    it("returns hero pick even when the Walk session comes first chronologically", () => {
      const walk = cardioSession("walk-first", "2026-05-28", {
        title: "Walking",
        activityName: "Walking",
        hkActivityId: 52,
        distanceMeters: 3_000,
        startIso: "2026-05-28T07:00:00.000Z",
        endIso: "2026-05-28T07:35:00.000Z",
      });
      const run = cardioSession("run-after", "2026-05-28", {
        title: "Outdoor Run",
        activityName: "Outdoor Run",
        hkActivityId: 37,
        distanceMeters: 4_000,
        startIso: "2026-05-28T17:00:00.000Z",
        endIso: "2026-05-28T17:30:00.000Z",
      });
      expect(pickBestRepresentativeCardioSessionForDay([walk, run])?.id).toBe("run-after");
    });

    it("prefers the highest-distance session within the same modality family", () => {
      const runShort = cardioSession("run-short", "2026-05-28", {
        title: "Running",
        activityName: "Running",
        hkActivityId: 37,
        distanceMeters: 3_000,
      });
      const runLong = cardioSession("run-long", "2026-05-28", {
        title: "Running",
        activityName: "Running",
        hkActivityId: 37,
        distanceMeters: 8_000,
      });
      expect(pickBestRepresentativeCardioSessionForDay([runShort, runLong])?.id).toBe("run-long");
    });

    it("prefers richer Apple Watch labels when modality family ties", () => {
      const run = cardioSession("run-generic", "2026-05-28", {
        title: "Running",
        activityName: "Running",
        hkActivityId: 37,
        distanceMeters: 4_000,
      });
      const outdoorRun = cardioSession("run-outdoor", "2026-05-28", {
        title: "Outdoor Run",
        activityName: "Outdoor Run",
        hkActivityId: 37,
        distanceMeters: 4_000,
      });
      expect(pickBestRepresentativeCardioSessionForDay([run, outdoorRun])?.id).toBe("run-outdoor");
    });

    it("returns null for an empty list and the only session for a singleton", () => {
      expect(pickBestRepresentativeCardioSessionForDay([])).toBeNull();
      const only = cardioSession("only", "2026-05-28", { title: "Walking", hkActivityId: 52 });
      expect(pickBestRepresentativeCardioSessionForDay([only])?.id).toBe("only");
    });
  });

  describe("resolveCardioSessionDisplayName", () => {
    it("returns the durable / server title override when present (highest priority)", () => {
      const session = cardioSession("with-durable", "2026-05-28", {
        title: "Outdoor Run",
        activityName: "Outdoor Run",
        hkActivityId: 37,
        distanceMeters: 5_000,
      });
      const durable = { [`${session.id}-w`]: "Sunday Long Run" };
      expect(resolveCardioSessionDisplayName(session, {}, durable)).toBe("Sunday Long Run");
    });

    it("falls back to AsyncStorage customTitle override when durable is empty", () => {
      const session = cardioSession("with-async", "2026-05-28", {
        title: "Running",
        activityName: "Running",
        hkActivityId: 37,
      });
      const overrides = {
        [`${session.id}-w`]: {
          workoutId: `${session.id}-w`,
          customTitle: "Recovery Jog",
          updatedAt: "2026-05-28T10:00:00.000Z",
        },
      };
      expect(resolveCardioSessionDisplayName(session, overrides, {})).toBe("Recovery Jog");
    });

    it("falls back to HK modality label when neither durable nor async override exists", () => {
      const session = cardioSession("no-override", "2026-05-28", {
        title: "Outdoor Run",
        activityName: "Outdoor Run",
        hkActivityId: 37,
        distanceMeters: 5_000,
      });
      expect(resolveCardioSessionDisplayName(session, {}, {})).toBe("Outdoor Run");
    });

    it("ignores blank / generic overrides and uses the modality label", () => {
      const session = cardioSession("generic-override", "2026-05-28", {
        title: "Walking",
        activityName: "Walking",
        hkActivityId: 52,
      });
      const overrides = {
        [`${session.id}-w`]: {
          workoutId: `${session.id}-w`,
          customTitle: "   ",
          updatedAt: "2026-05-28T10:00:00.000Z",
        },
      };
      expect(resolveCardioSessionDisplayName(session, overrides, { [`${session.id}-w`]: "workout" })).toBe(
        "Walking",
      );
    });

    it("does not mutate the input session", () => {
      const session = cardioSession("immutable", "2026-05-28", {
        title: "Outdoor Run",
        activityName: "Outdoor Run",
        hkActivityId: 37,
      });
      const before = JSON.stringify(session);
      resolveCardioSessionDisplayName(session, {}, { [`${session.id}-w`]: "Hill Repeats" });
      expect(JSON.stringify(session)).toBe(before);
    });
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
