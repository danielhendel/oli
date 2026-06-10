// lib/features/timeline/__tests__/buildTimelineDayVm.test.ts
import { buildTimelineDayVm } from "@/lib/features/timeline/buildTimelineDayVm";
import type {
  CanonicalEventListItem,
  InsightDto,
  RawEventListItem,
  SleepNightViewDto,
} from "@oli/contracts";

const DAY = "2026-06-10";

function canonical(partial: Partial<CanonicalEventListItem>): CanonicalEventListItem {
  return {
    id: "ev",
    userId: "u1",
    sourceId: "apple_health",
    kind: "workout",
    start: `${DAY}T09:00:00.000Z`,
    end: `${DAY}T10:00:00.000Z`,
    day: DAY,
    timezone: "UTC",
    createdAt: `${DAY}T09:00:00.000Z`,
    updatedAt: `${DAY}T09:00:00.000Z`,
    schemaVersion: 1,
    ...partial,
  };
}

function rawNutrition(
  id: string,
  observedAt: string,
  payload: Record<string, unknown>,
): RawEventListItem {
  return {
    id,
    userId: "u1",
    sourceId: "manual",
    kind: "nutrition",
    observedAt,
    receivedAt: observedAt,
    schemaVersion: 1,
    payload: {
      start: observedAt,
      end: observedAt,
      timezone: "UTC",
      totalKcal: 320,
      proteinG: 10,
      carbsG: 40,
      fatG: 8,
      ...payload,
    },
  };
}

function rawIncomplete(id: string, observedAt: string): RawEventListItem {
  return {
    id,
    userId: "u1",
    sourceId: "manual",
    kind: "incomplete",
    observedAt,
    receivedAt: observedAt,
    schemaVersion: 1,
    payload: { note: "" },
  };
}

function sleepNight(endedAt: string, totalSleepMinutes?: number): SleepNightViewDto {
  return {
    requestedDay: DAY,
    anchorDay: DAY,
    wakeDay: DAY,
    resolution: "exact_anchor",
    isFallback: false,
    sleepNight: {
      anchorDay: DAY,
      wakeDay: DAY,
      provider: "oura",
      source: "ouraVendorSleep",
      sourceDocumentId: "doc1",
      score: 80,
      isComplete: true,
      endedAt,
      ...(typeof totalSleepMinutes === "number" ? { totalSleepMinutes } : {}),
    },
  };
}

function insight(id: string, createdAt: string): InsightDto {
  return {
    schemaVersion: 1,
    id,
    userId: "u1",
    date: DAY,
    kind: "sleep",
    title: "Good sleep",
    message: "You slept well",
    severity: "info",
    evidence: [],
    createdAt,
    updatedAt: createdAt,
    ruleVersion: "v1",
  };
}

describe("buildTimelineDayVm", () => {
  it("returns an empty vm when no sources have data", () => {
    const vm = buildTimelineDayVm({ day: DAY });
    expect(vm.isEmpty).toBe(true);
    expect(vm.items).toHaveLength(0);
    expect(vm.summary).toBeNull();
  });

  it("sorts merged items chronologically (ascending) regardless of input order", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      events: [
        canonical({ id: "w1", kind: "workout", start: `${DAY}T09:00:00.000Z` }),
        canonical({ id: "wt1", kind: "weight", start: `${DAY}T06:30:00.000Z` }),
      ],
      rawItems: [
        rawNutrition("n1", `${DAY}T08:00:00.000Z`, { foodLabel: "Cereal" }),
        rawNutrition("n0", `${DAY}T07:25:00.000Z`, { foodLabel: "Coffee" }),
      ],
    });

    const times = vm.items.map((i) => i.timestamp);
    expect(times).toEqual([...times].sort());
    expect(vm.items[0]?.timestamp).toBe(`${DAY}T06:30:00.000Z`);
    expect(vm.items[vm.items.length - 1]?.timestamp).toBe(`${DAY}T09:00:00.000Z`);
  });

  it("merges passive (canonical) and manual (raw) items together", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      events: [canonical({ id: "w1", kind: "workout", start: `${DAY}T09:00:00.000Z` })],
      rawItems: [
        rawNutrition("n1", `${DAY}T08:00:00.000Z`, { foodLabel: "Eggs" }),
        rawIncomplete("i1", `${DAY}T10:00:00.000Z`),
      ],
    });

    const ids = vm.items.map((i) => i.id);
    expect(ids).toContain("w1");
    expect(ids).toContain("n1");
    expect(ids).toContain("i1");

    const nutrition = vm.items.find((i) => i.id === "n1");
    expect(nutrition?.isPassive).toBe(false);
    const workout = vm.items.find((i) => i.id === "w1");
    expect(workout?.isPassive).toBe(true);
  });

  it("classifies coffee as a caffeine item via the food label heuristic", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      rawItems: [rawNutrition("n0", `${DAY}T07:25:00.000Z`, { foodLabel: "Cold brew coffee" })],
    });
    expect(vm.items[0]?.sourceType).toBe("caffeine");
    expect(vm.items[0]?.title).toBe("Cold brew coffee");
  });

  it("adds a wake row from the sleep night and dedupes canonical sleep events", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      events: [canonical({ id: "s1", kind: "sleep", start: `${DAY}T06:00:00.000Z` })],
      sleepNight: sleepNight(`${DAY}T07:20:00.000Z`, 465),
    });

    const sleepCanonical = vm.items.find((i) => i.id === "s1");
    expect(sleepCanonical).toBeUndefined();

    const wake = vm.items.find((i) => i.sourceType === "sleep_wake");
    expect(wake).toBeDefined();
    expect(wake?.title).toBe("Woke up");
    expect(wake?.subtitle).toBe("7h 45m sleep");
  });

  it("keeps canonical sleep when there is no sleep night", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      events: [canonical({ id: "s1", kind: "sleep", start: `${DAY}T06:00:00.000Z` })],
    });
    expect(vm.items.find((i) => i.id === "s1")?.sourceType).toBe("sleep");
  });

  it("includes insights and builds a summary from daily facts", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      insights: [insight("ins1", `${DAY}T12:00:00.000Z`)],
      dailyFacts: {
        schemaVersion: 1,
        userId: "u1",
        date: DAY,
        computedAt: `${DAY}T23:00:00.000Z`,
        activity: { steps: 8000 },
        nutrition: { totalKcal: 2100 },
        sleep: { totalMinutes: 465 },
      } as never,
    });

    expect(vm.items.find((i) => i.sourceType === "insight")?.title).toBe("Good sleep");
    expect(vm.summary).toEqual({ steps: 8000, totalKcal: 2100, sleepMinutes: 465 });
  });

  it("skips items with unparseable timestamps", () => {
    const vm = buildTimelineDayVm({
      day: DAY,
      rawItems: [rawNutrition("bad", "not-a-date", { foodLabel: "Mystery" })],
    });
    expect(vm.items).toHaveLength(0);
  });
});
