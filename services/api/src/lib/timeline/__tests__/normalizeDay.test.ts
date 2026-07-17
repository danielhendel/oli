import {
  decodeTimelineFeedCursor,
  encodeTimelineFeedCursor,
} from "../cursor";
import { dedupeTimelineFeedItems } from "../dedupe";
import { normalizeTimelineDay } from "../normalizeDay";
import {
  compareTimelineFeedItems,
  isAfterTimelineFeedCursor,
  sortTimelineFeedItems,
} from "../order";
import type { TimelinePresentationItem } from "@oli/contracts";

function baseItem(
  overrides: Partial<TimelinePresentationItem> &
    Pick<TimelinePresentationItem, "id" | "kind" | "occurredAt" | "day">,
): TimelinePresentationItem {
  return {
    timezone: "UTC",
    title: overrides.title ?? overrides.kind,
    status: "ready",
    source: "manual",
    destination: "/(app)/(tabs)/timeline/2026-07-16",
    accessibilityLabel: overrides.title ?? overrides.kind,
    dedupeKey: overrides.dedupeKey ?? overrides.id,
    isSynthetic: false,
    displayRole: overrides.displayRole ?? "chronological_event",
    ...overrides,
  };
}

describe("timeline feed cursor", () => {
  test("round-trips opaque payload", () => {
    const payload = {
      day: "2026-07-16",
      occurredAt: "2026-07-16T12:00:00.000Z",
      kindPriority: 10,
      id: "evt_1",
    };
    const encoded = encodeTimelineFeedCursor(payload);
    expect(encoded.includes("evt_1")).toBe(false);
    expect(decodeTimelineFeedCursor(encoded)).toEqual(payload);
  });

  test("rejects malformed cursor", () => {
    expect(decodeTimelineFeedCursor("not-valid")).toBeNull();
  });
});

describe("timeline feed ordering", () => {
  test("orders by occurredAt then kind priority then id", () => {
    const items = [
      baseItem({
        id: "b",
        kind: "nutrition",
        day: "2026-07-16",
        occurredAt: "2026-07-16T10:00:00.000Z",
      }),
      baseItem({
        id: "a",
        kind: "incomplete",
        day: "2026-07-16",
        occurredAt: "2026-07-16T10:00:00.000Z",
      }),
      baseItem({
        id: "c",
        kind: "nutrition",
        day: "2026-07-16",
        occurredAt: "2026-07-16T09:00:00.000Z",
      }),
    ];
    const sorted = sortTimelineFeedItems(items);
    expect(sorted.map((i) => i.id)).toEqual(["c", "b", "a"]);
    expect(compareTimelineFeedItems(items[0]!, items[1]!)).toBeLessThan(0);
  });

  test("isAfterTimelineFeedCursor continues busy day", () => {
    const cursor = {
      day: "2026-07-16",
      occurredAt: "2026-07-16T10:00:00.000Z",
      kindPriority: 10,
      id: "mid",
    };
    const before = baseItem({
      id: "aaa",
      kind: "nutrition",
      day: "2026-07-16",
      occurredAt: "2026-07-16T10:00:00.000Z",
    });
    const after = baseItem({
      id: "zzz",
      kind: "nutrition",
      day: "2026-07-16",
      occurredAt: "2026-07-16T10:00:00.000Z",
    });
    expect(isAfterTimelineFeedCursor(before, cursor)).toBe(false);
    expect(isAfterTimelineFeedCursor(after, cursor)).toBe(true);
  });
});

describe("timeline feed dedupe", () => {
  test("dedupes by id and dedupeKey", () => {
    const items = [
      baseItem({
        id: "1",
        kind: "nutrition",
        day: "2026-07-16",
        occurredAt: "2026-07-16T08:00:00.000Z",
        dedupeKey: "k1",
      }),
      baseItem({
        id: "1",
        kind: "nutrition",
        day: "2026-07-16",
        occurredAt: "2026-07-16T09:00:00.000Z",
        dedupeKey: "k2",
      }),
      baseItem({
        id: "2",
        kind: "nutrition",
        day: "2026-07-16",
        occurredAt: "2026-07-16T10:00:00.000Z",
        dedupeKey: "k1",
      }),
    ];
    expect(dedupeTimelineFeedItems(items).map((i) => i.id)).toEqual(["1"]);
  });
});

describe("normalizeTimelineDay", () => {
  test("emits sleep then recovery context before chronological events", () => {
    const items = normalizeTimelineDay({
      day: "2026-07-16",
      todayDay: "2026-07-16",
      nowIso: "2026-07-16T15:00:00.000Z",
      events: [
        {
          id: "w1",
          userId: "u",
          sourceId: "manual",
          kind: "strength_workout",
          start: "2026-07-16T11:00:00.000Z",
          end: "2026-07-16T12:00:00.000Z",
          day: "2026-07-16",
          timezone: "UTC",
          createdAt: "2026-07-16T12:00:00.000Z",
          updatedAt: "2026-07-16T12:00:00.000Z",
          schemaVersion: 1,
        },
      ],
      readiness: { connected: true, score: 82 },
      sleepNight: {
        requestedDay: "2026-07-16",
        anchorDay: "2026-07-15",
        wakeDay: "2026-07-16",
        resolution: "wake_day",
        isFallback: false,
        sleepNight: {
          anchorDay: "2026-07-15",
          wakeDay: "2026-07-16",
          provider: "oura",
          source: "ouraVendorSleep",
          sourceDocumentId: "sn1",
          score: 77,
          totalSleepMinutes: 420,
          isComplete: true,
          startedAt: "2026-07-15T23:30:00.000Z",
          endedAt: "2026-07-16T07:00:00.000Z",
        },
      },
    });

    expect(items[0]?.kind).toBe("sleep_context");
    expect(items[1]?.kind).toBe("recovery_context");
    expect(items.some((i) => i.kind === "workout_strength")).toBe(true);
    expect(items.some((i) => i.kind === "sleep_wake")).toBe(true);
    expect(items.some((i) => i.kind === "activity_live")).toBe(true);
    expect(items.some((i) => i.kind === "steps")).toBe(false);
  });

  test("merges matching strength_workout + workout into one presentation item", () => {
    const items = normalizeTimelineDay({
      day: "2026-07-16",
      todayDay: "2026-07-16",
      nowIso: "2026-07-16T20:00:00.000Z",
      events: [
        {
          id: "m1",
          userId: "u",
          sourceId: "manual",
          kind: "strength_workout",
          start: "2026-07-16T18:00:00.000Z",
          end: "2026-07-16T18:00:00.000Z",
          day: "2026-07-16",
          timezone: "UTC",
          createdAt: "2026-07-16T18:00:00.000Z",
          updatedAt: "2026-07-16T18:00:00.000Z",
          schemaVersion: 1,
        },
        {
          id: "a1",
          userId: "u",
          sourceId: "apple_health",
          kind: "workout",
          start: "2026-07-16T18:02:00.000Z",
          end: "2026-07-16T19:00:00.000Z",
          day: "2026-07-16",
          timezone: "UTC",
          createdAt: "2026-07-16T19:00:00.000Z",
          updatedAt: "2026-07-16T19:00:00.000Z",
          schemaVersion: 1,
        },
      ],
      readiness: { connected: false, score: null },
    });
    const workouts = items.filter(
      (i) =>
        i.kind === "workout" ||
        i.kind === "workout_strength" ||
        i.kind === "workout_cardio",
    );
    expect(workouts).toHaveLength(1);
    expect(workouts[0]!.dedupeKey).toBe("workout_session:a1|m1");
    expect(workouts[0]!.id).toContain("m1");
    expect(workouts[0]!.id).toContain("a1");
    expect(JSON.stringify(workouts[0])).not.toMatch(/providerPayload|rawPayload/);
  });

  test("keeps two far-apart same-kind workouts distinct", () => {
    const items = normalizeTimelineDay({
      day: "2026-07-16",
      todayDay: "2026-07-16",
      nowIso: "2026-07-16T20:00:00.000Z",
      events: [
        {
          id: "w1",
          userId: "u",
          sourceId: "apple_health",
          kind: "workout",
          start: "2026-07-16T07:00:00.000Z",
          end: "2026-07-16T07:30:00.000Z",
          day: "2026-07-16",
          timezone: "UTC",
          createdAt: "2026-07-16T07:30:00.000Z",
          updatedAt: "2026-07-16T07:30:00.000Z",
          schemaVersion: 1,
        },
        {
          id: "w2",
          userId: "u",
          sourceId: "apple_health",
          kind: "workout",
          start: "2026-07-16T18:00:00.000Z",
          end: "2026-07-16T18:30:00.000Z",
          day: "2026-07-16",
          timezone: "UTC",
          createdAt: "2026-07-16T18:30:00.000Z",
          updatedAt: "2026-07-16T18:30:00.000Z",
          schemaVersion: 1,
        },
      ],
      readiness: { connected: false, score: null },
    });
    const workouts = items.filter((i) => i.kind === "workout");
    expect(workouts).toHaveLength(2);
  });

  test("skips canonical steps and emits historical activity_final", () => {
    const items = normalizeTimelineDay({
      day: "2026-07-15",
      todayDay: "2026-07-16",
      nowIso: "2026-07-16T15:00:00.000Z",
      events: [
        {
          id: "s1",
          userId: "u",
          sourceId: "apple_health",
          kind: "steps",
          start: "2026-07-15T00:00:00.000Z",
          end: "2026-07-15T23:59:59.000Z",
          day: "2026-07-15",
          timezone: "UTC",
          createdAt: "2026-07-15T23:59:59.000Z",
          updatedAt: "2026-07-15T23:59:59.000Z",
          schemaVersion: 1,
        },
      ],
      dailyFacts: {
        day: "2026-07-15",
        activity: { steps: 8400 },
      } as never,
      readiness: { connected: false, score: null },
    });

    expect(items.some((i) => i.id === "s1")).toBe(false);
    expect(items.some((i) => i.kind === "activity_final")).toBe(true);
    expect(items.some((i) => i.kind === "activity_live")).toBe(false);
  });

  test("emits bedtime on sleep-start day via bedtimeNights", () => {
    const items = normalizeTimelineDay({
      day: "2026-07-15",
      todayDay: "2026-07-16",
      nowIso: "2026-07-16T15:00:00.000Z",
      bedtimeNights: [
        {
          requestedDay: "2026-07-16",
          anchorDay: "2026-07-15",
          wakeDay: "2026-07-16",
          resolution: "wake_day",
          isFallback: false,
          sleepNight: {
            anchorDay: "2026-07-15",
            wakeDay: "2026-07-16",
            provider: "oura",
            source: "ouraVendorSleep",
            sourceDocumentId: "sn1",
            isComplete: true,
            startedAt: "2026-07-15T23:10:00.000Z",
            endedAt: "2026-07-16T07:00:00.000Z",
          },
        },
      ],
      readiness: { connected: false, score: null },
    });

    const bedtime = items.find((i) => i.kind === "sleep_start");
    expect(bedtime?.day).toBe("2026-07-15");
    expect(bedtime?.dedupeKey).toBe("sleep_start:2026-07-15");
  });

  test("does not fabricate reminder or recommendation roles", () => {
    const items = normalizeTimelineDay({
      day: "2026-07-16",
      todayDay: "2026-07-16",
      nowIso: "2026-07-16T15:00:00.000Z",
      readiness: { connected: false, score: null },
    });
    expect(items.every((i) => i.displayRole !== "reminder")).toBe(true);
    expect(items.every((i) => i.displayRole !== "recommendation")).toBe(true);
  });
});
