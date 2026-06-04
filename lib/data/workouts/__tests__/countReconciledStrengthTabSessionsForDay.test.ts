import {
  appleHealthWorkoutDuplicateKey,
  collapseAppleHealthDuplicateWorkoutCanonicals,
  countReconciledStrengthTabSessionsForDay,
  extractAppleHealthWorkoutUuid,
  parseAppleHealthWorkoutWindowFromCanonicalId,
} from "../countReconciledStrengthTabSessionsForDay";
import type { CanonicalWorkoutEventForReconcile } from "../countReconciledStrengthTabSessionsForDay";

const day = "2026-06-01" as const;

const APPLE_UUID = "52A581D0-95A2-43FC-A018-3118F3D4AA29";

function appleWorkoutId(startLocal: string, endLocal: string, dur: number, uuid = APPLE_UUID): string {
  return `appleHealth:v2:workout:${startLocal}_${endLocal}_${dur}_com.apple.health.${uuid}`;
}

function strengthWorkout(
  overrides: Partial<CanonicalWorkoutEventForReconcile & { kind: "strength_workout" }> &
    Pick<CanonicalWorkoutEventForReconcile & { kind: "strength_workout" }, "id" | "start" | "end">,
): CanonicalWorkoutEventForReconcile {
  return {
    kind: "strength_workout",
    sourceId: "manual",
    exercises: [{ exercise: "Bench Press" }],
    ...overrides,
  };
}

function appleStrengthWorkout(
  overrides: Partial<CanonicalWorkoutEventForReconcile & { kind: "workout" }> &
    Pick<CanonicalWorkoutEventForReconcile & { kind: "workout" }, "id" | "start" | "end">,
): CanonicalWorkoutEventForReconcile {
  return {
    kind: "workout",
    sourceId: "apple_health",
    sport: "TraditionalStrengthTraining",
    durationMinutes: 52,
    ...overrides,
  };
}

describe("countReconciledStrengthTabSessionsForDay", () => {
  it("counts 1 when manual strength_workout and Apple strength workout overlap the same session", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      strengthWorkout({
        id: "manual-1",
        start: "2026-06-01T17:00:00.000Z",
        end: "2026-06-01T18:00:00.000Z",
      }),
      appleStrengthWorkout({
        id: "apple-1",
        start: "2026-06-01T17:20:00.000Z",
        end: "2026-06-01T18:10:00.000Z",
        durationMinutes: 50,
      }),
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 1 when duplicate Apple strength workouts overlap (timezone / re-import variants)", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      appleStrengthWorkout({
        id: "apple-a",
        start: "2026-06-01T10:00:00.000Z",
        end: "2026-06-01T11:00:00.000Z",
        durationMinutes: 60,
      }),
      appleStrengthWorkout({
        id: "apple-b",
        start: "2026-06-01T10:05:00.000Z",
        end: "2026-06-01T11:05:00.000Z",
        durationMinutes: 60,
      }),
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 2 for two separated strength sessions on the same day", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      appleStrengthWorkout({
        id: "am",
        start: "2026-06-01T08:00:00.000Z",
        end: "2026-06-01T09:00:00.000Z",
        durationMinutes: 60,
      }),
      appleStrengthWorkout({
        id: "pm",
        start: "2026-06-01T17:00:00.000Z",
        end: "2026-06-01T18:00:00.000Z",
        durationMinutes: 60,
      }),
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(2);
  });

  it("does not count cardio-only workout canonicals", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: "run-1",
        sourceId: "apple_health",
        start: "2026-06-01T07:00:00.000Z",
        end: "2026-06-01T07:30:00.000Z",
        sport: "running",
        durationMinutes: 30,
        distanceMeters: 5000,
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(0);
  });

  it("counts 1 for -0400 and +0200 Apple Health canonical variants of the same HK UUID", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
        sourceId: "apple_health",
        start: "2026-06-01T05:49:42.195-0400",
        end: "2026-06-01T06:39:43.697-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
        updatedAt: "2026-06-01T11:00:00.000Z",
      },
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50),
        sourceId: "apple_health",
        start: "2026-06-01T11:49:42.195+0200",
        end: "2026-06-01T12:39:43.697+0200",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
        updatedAt: "2026-06-01T11:00:00.000Z",
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 1 when Apple duplicates use wall-clock Z canonical fields but offset ids (prod bug shape)", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
        sourceId: "apple_health",
        start: "2026-06-01T05:49:42.195Z",
        end: "2026-06-01T06:39:43.697Z",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50),
        sourceId: "apple_health",
        start: "2026-06-01T11:49:42.195Z",
        end: "2026-06-01T12:39:43.697Z",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "strength_workout",
        id: "msw_2026-06-01T09_49_42.195Z_3fcd7d1fc3f61b69",
        sourceId: "manual",
        start: "2026-06-01T09:49:42.195Z",
        end: "2026-06-01T10:39:42.195Z",
        exercises: [{ exercise: "Incline Barbell Bench Press" }],
      },
    ];
    expect(collapseAppleHealthDuplicateWorkoutCanonicals(events).filter((e) => e.kind === "workout")).toHaveLength(1);
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 1 for Apple duplicate timezone variants + manual strength_workout (real prod shape)", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
        sourceId: "apple_health",
        start: "2026-06-01T05:49:42.195-0400",
        end: "2026-06-01T06:39:43.697-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50),
        sourceId: "apple_health",
        start: "2026-06-01T11:49:42.195+0200",
        end: "2026-06-01T12:39:43.697+0200",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "strength_workout",
        id: "msw_2026-06-01T09_49_42.195Z_3fcd7d1fc3f61b69",
        sourceId: "manual",
        start: "2026-06-01T09:49:42.195Z",
        end: "2026-06-01T10:39:42.195Z",
        exercises: [{ exercise: "Incline Barbell Bench Press" }],
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(1);
  });

  it("counts 2 for two genuinely separate Apple workouts with different UUIDs", () => {
    const otherUuid = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T08:00:00.000-0400", "2026-06-01T09:00:00.000-0400", 60),
        sourceId: "apple_health",
        start: "2026-06-01T08:00:00.000-0400",
        end: "2026-06-01T09:00:00.000-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 60,
        timezone: "America/New_York",
      },
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T17:00:00.000-0400", "2026-06-01T18:00:00.000-0400", 60, otherUuid),
        sourceId: "apple_health",
        start: "2026-06-01T17:00:00.000-0400",
        end: "2026-06-01T18:00:00.000-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 60,
        timezone: "America/New_York",
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(2);
  });

  it("counts 2 for two separate Apple workouts that SHARE the device UUID but differ in time", () => {
    // Real prod shape: the `com.apple.health.<UUID>` suffix is a device id shared across workouts.
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T08:00:00.000-0400", "2026-06-01T09:00:00.000-0400", 60),
        sourceId: "apple_health",
        start: "2026-06-01T08:00:00.000-0400",
        end: "2026-06-01T09:00:00.000-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 60,
        timezone: "America/New_York",
      },
      {
        kind: "workout",
        // Same device UUID, but a genuinely different workout 9 hours later.
        id: appleWorkoutId("2026-06-01T17:00:00.000-0400", "2026-06-01T18:00:00.000-0400", 60),
        sourceId: "apple_health",
        start: "2026-06-01T17:00:00.000-0400",
        end: "2026-06-01T18:00:00.000-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 60,
        timezone: "America/New_York",
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(2);
  });

  it("does not collapse non-Apple workouts that lack an HK UUID", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "strength_workout",
        id: "msw_2026-06-01T08_00_00.000Z_aaa",
        sourceId: "manual",
        start: "2026-06-01T08:00:00.000Z",
        end: "2026-06-01T09:00:00.000Z",
        exercises: [{ exercise: "Squat" }],
      },
      {
        kind: "strength_workout",
        id: "msw_2026-06-01T17_00_00.000Z_bbb",
        sourceId: "manual",
        start: "2026-06-01T17:00:00.000Z",
        end: "2026-06-01T18:00:00.000Z",
        exercises: [{ exercise: "Deadlift" }],
      },
    ];
    expect(countReconciledStrengthTabSessionsForDay(day, events)).toBe(2);
  });
});

describe("parseAppleHealthWorkoutWindowFromCanonicalId", () => {
  it("parses offset ISO start/end from the 2026-06-01 prod id pair", () => {
    const idA = appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50);
    const idB = appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50);
    const a = parseAppleHealthWorkoutWindowFromCanonicalId(idA);
    const b = parseAppleHealthWorkoutWindowFromCanonicalId(idB);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.startMs).toBe(b!.startMs);
    expect(a!.endMs).toBe(b!.endMs);
    expect(a!.startMs).toBe(Date.parse("2026-06-01T09:49:42.195Z"));
  });
});

describe("appleHealthWorkoutDuplicateKey", () => {
  it("matches for -0400/+0200 ids even when canonical start/end are wall-clock Z", () => {
    const base = {
      kind: "workout" as const,
      sourceId: "apple_health",
      sport: "TraditionalStrengthTraining",
      durationMinutes: 50,
      timezone: "America/New_York",
    };
    const a = {
      ...base,
      id: appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
      start: "2026-06-01T05:49:42.195Z",
      end: "2026-06-01T06:39:43.697Z",
    };
    const b = {
      ...base,
      id: appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50),
      start: "2026-06-01T11:49:42.195Z",
      end: "2026-06-01T12:39:43.697Z",
    };
    expect(appleHealthWorkoutDuplicateKey(a)).toBe(appleHealthWorkoutDuplicateKey(b));
  });
});

describe("extractAppleHealthWorkoutUuid", () => {
  it("extracts the UUID after com.apple.health.", () => {
    expect(
      extractAppleHealthWorkoutUuid(
        appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
      ),
    ).toBe(APPLE_UUID);
  });

  it("returns null for manual / non-Apple ids", () => {
    expect(extractAppleHealthWorkoutUuid("msw_2026-06-01T09_49_42.195Z_3fcd7d1fc3f61b69")).toBeNull();
    expect(extractAppleHealthWorkoutUuid("run-1")).toBeNull();
  });
});

describe("collapseAppleHealthDuplicateWorkoutCanonicals", () => {
  it("collapses the 2026-06-01 -0400/+0200 pair to one workout before reconcile", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
        sourceId: "apple_health",
        start: "2026-06-01T05:49:42.195-0400",
        end: "2026-06-01T06:39:43.697-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50),
        sourceId: "apple_health",
        start: "2026-06-01T11:49:42.195+0200",
        end: "2026-06-01T12:39:43.697+0200",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
    ];
    expect(collapseAppleHealthDuplicateWorkoutCanonicals(events)).toHaveLength(1);
  });

  it("keeps one representative per UUID and preserves manual rows", () => {
    const events: CanonicalWorkoutEventForReconcile[] = [
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T05:49:42.195-0400", "2026-06-01T06:39:43.697-0400", 50),
        sourceId: "apple_health",
        start: "2026-06-01T05:49:42.195-0400",
        end: "2026-06-01T06:39:43.697-0400",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "workout",
        id: appleWorkoutId("2026-06-01T11:49:42.195+0200", "2026-06-01T12:39:43.697+0200", 50),
        sourceId: "apple_health",
        start: "2026-06-01T11:49:42.195+0200",
        end: "2026-06-01T12:39:43.697+0200",
        sport: "TraditionalStrengthTraining",
        durationMinutes: 50,
        timezone: "America/New_York",
      },
      {
        kind: "strength_workout",
        id: "msw_x",
        sourceId: "manual",
        start: "2026-06-01T09:49:42.195Z",
        end: "2026-06-01T10:39:42.195Z",
        exercises: [{ exercise: "Bench" }],
      },
    ];
    const out = collapseAppleHealthDuplicateWorkoutCanonicals(events);
    expect(out).toHaveLength(2);
    const appleRows = out.filter((e) => e.kind === "workout");
    expect(appleRows).toHaveLength(1);
    // Offset-matched representative is the -0400 (America/New_York) variant.
    expect(appleRows[0]!.start).toBe("2026-06-01T05:49:42.195-0400");
    expect(out.some((e) => e.kind === "strength_workout" && e.id === "msw_x")).toBe(true);
  });
});
