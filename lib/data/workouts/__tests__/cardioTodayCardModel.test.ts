import { buildCardioTodayCardModel } from "../cardioTodayCardModel";

describe("buildCardioTodayCardModel", () => {
  it("lists every qualifying cardio session today in chronological order", () => {
    const model = buildCardioTodayCardModel({
      todayDayKey: "2026-05-02",
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      cardioCalendarDays: [
        {
          day: "2026-05-02",
          workouts: [
            {
              id: "late",
              observedAt: "2026-05-02T12:00:00.000Z",
              sourceId: "apple_health",
              title: "Walking",
              workoutType: "cardio" as const,
              start: "2026-05-02T12:00:00.000Z",
              end: "2026-05-02T12:26:00.000Z",
              durationMinutes: 26,
              calories: null,
              distanceMeters: 1.33 * 1609.344,
              activityName: "Walking",
              hk: { sourceId: "healthkit", activityId: 52 },
            },
            {
              id: "early",
              observedAt: "2026-05-02T08:00:00.000Z",
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: "2026-05-02T08:00:00.000Z",
              end: "2026-05-02T08:10:00.000Z",
              durationMinutes: 10,
              calories: null,
              distanceMeters: 1.01 * 1609.344,
              activityName: "Running",
              hk: { sourceId: "healthkit", activityId: 37 },
            },
          ],
        },
      ],
    });
    expect(model.kind).toBe("completed");
    if (model.kind !== "completed") return;
    expect(model.sessions).toHaveLength(2);
    expect(model.sessions[0]!.primaryLine).toContain("1.01 mi");
    expect(model.sessions[0]!.metaLine).toContain("Running");
    expect(model.sessions[1]!.primaryLine).toContain("1.33 mi");
    expect(model.sessions[1]!.metaLine).toContain("Walking");
  });

  it("uses miles-only primary line and modality · minutes in meta", () => {
    const model = buildCardioTodayCardModel({
      todayDayKey: "2026-03-12",
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      cardioCalendarDays: [
        {
          day: "2026-03-12",
          workouts: [
            {
              id: "c-run",
              observedAt: "2026-03-12T08:00:00.000Z",
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: "2026-03-12T08:00:00.000Z",
              end: "2026-03-12T08:35:00.000Z",
              durationMinutes: 35,
              calories: null,
              distanceMeters: 5000,
              activityName: "Running",
              hk: { sourceId: "healthkit", activityId: 37 },
            },
          ],
        },
      ],
    });
    expect(model.kind).toBe("completed");
    if (model.kind !== "completed") return;
    expect(model.sessions[0]!.primaryLine).toMatch(/^\d+\.\d{2} mi$/);
    expect(model.sessions[0]!.primaryLine).not.toContain("min");
    expect(model.sessions[0]!.metaLine).toContain("·");
    expect(model.sessions[0]!.metaLine).toContain("Running");
  });

  it("returns rest when no qualifying cardio exists today", () => {
    const model = buildCardioTodayCardModel({
      todayDayKey: "2026-03-12",
      overridesByWorkoutId: {},
      durableTitlesByWorkoutId: {},
      cardioCalendarDays: [
        {
          day: "2026-03-11",
          workouts: [
            {
              id: "c-old",
              observedAt: "2026-03-11T08:00:00.000Z",
              sourceId: "apple_health",
              title: "Running",
              workoutType: "cardio" as const,
              start: "2026-03-11T08:00:00.000Z",
              end: "2026-03-11T08:35:00.000Z",
              durationMinutes: 35,
              calories: null,
              distanceMeters: 5000,
              activityName: "Running",
            },
          ],
        },
      ],
    });
    expect(model).toEqual({
      kind: "rest",
      pill: "No Cardio",
      primaryTitle: "No cardio today",
      subtitle: "Log a session when you train",
    });
  });
});
