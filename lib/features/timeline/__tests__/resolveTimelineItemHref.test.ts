// lib/features/timeline/__tests__/resolveTimelineItemHref.test.ts
import {
  eventDetailHref,
  resolveTimelineItemHref,
} from "@/lib/features/timeline/resolveTimelineItemHref";
import type { TimelineSourceType } from "@/lib/features/timeline/types";

const DAY = "2026-06-10";

describe("resolveTimelineItemHref", () => {
  it("routes nutrition / caffeine / supplement to the nutrition day screen", () => {
    for (const t of ["nutrition", "caffeine", "supplement"] as TimelineSourceType[]) {
      expect(resolveTimelineItemHref({ sourceType: t, day: DAY })).toBe(
        `/(app)/nutrition/day/${DAY}`,
      );
    }
  });

  it("routes strength + generic workouts to the workouts day screen", () => {
    expect(resolveTimelineItemHref({ sourceType: "workout_strength", day: DAY })).toBe(
      `/(app)/workouts/day/${DAY}`,
    );
    expect(resolveTimelineItemHref({ sourceType: "workout", day: DAY })).toBe(
      `/(app)/workouts/day/${DAY}`,
    );
  });

  it("routes cardio, activity, body, and recovery to their module screens", () => {
    expect(resolveTimelineItemHref({ sourceType: "workout_cardio", day: DAY })).toBe(
      `/(app)/cardio/day/${DAY}`,
    );
    expect(resolveTimelineItemHref({ sourceType: "steps", day: DAY })).toBe(
      `/(app)/activity/day/${DAY}`,
    );
    expect(resolveTimelineItemHref({ sourceType: "weight", day: DAY })).toBe(
      `/(app)/body/day/${DAY}`,
    );
    expect(resolveTimelineItemHref({ sourceType: "sleep_wake", day: DAY })).toBe(
      `/(app)/recovery/sleep?day=${DAY}`,
    );
    expect(resolveTimelineItemHref({ sourceType: "hrv", day: DAY })).toBe(
      `/(app)/recovery/readiness`,
    );
  });

  it("routes labs, uploads, and insights to existing screens", () => {
    expect(resolveTimelineItemHref({ sourceType: "lab", day: DAY })).toBe(`/(app)/labs`);
    expect(resolveTimelineItemHref({ sourceType: "upload", day: DAY })).toBe(`/(app)/labs`);
    expect(resolveTimelineItemHref({ sourceType: "insight", day: DAY })).toBe(
      `/(app)/dash/daily-recap`,
    );
  });

  it("keeps incomplete/manual items on the timeline day route", () => {
    expect(resolveTimelineItemHref({ sourceType: "incomplete", day: DAY })).toBe(
      `/(app)/(tabs)/timeline/${DAY}`,
    );
  });

  it("falls back to event detail for unknown canonical-backed items", () => {
    expect(
      resolveTimelineItemHref({ sourceType: "unknown", day: DAY, canonicalEventId: "ev_1" }),
    ).toBe("/(app)/event/ev_1");
    expect(resolveTimelineItemHref({ sourceType: "unknown", day: DAY })).toBe(
      `/(app)/(tabs)/timeline/${DAY}`,
    );
  });

  it("encodes the canonical id in the event detail href", () => {
    expect(eventDetailHref("a b")).toBe("/(app)/event/a%20b");
  });
});
