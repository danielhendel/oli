// lib/modules/__tests__/commandCenterCardio.test.ts
import {
  buildCardioCommandCenterModel,
  formatDistanceDualDisplay,
  isMilesFirstLocale,
} from "../commandCenterCardio";
import type { DailyFactsDto } from "../../contracts/dailyFacts";

function makeFacts(overrides: Partial<DailyFactsDto> = {}): DailyFactsDto {
  return {
    schemaVersion: 1,
    userId: "u1",
    date: "2026-02-06",
    computedAt: "2026-02-06T12:00:00.000Z",
    ...overrides,
  };
}

describe("formatDistanceDualDisplay", () => {
  it("returns miles-first for en-US", () => {
    const result = formatDistanceDualDisplay({ distanceKm: 5, locale: "en-US" });
    expect(result.primary).toContain("mi");
    expect(result.secondary).toContain("km");
    expect(result.combined).toMatch(/^[\d.]+ mi \([\d.]+ km\)$/);
  });

  it("returns km-first for en-GB", () => {
    const result = formatDistanceDualDisplay({ distanceKm: 5, locale: "en-GB" });
    expect(result.primary).toContain("km");
    expect(result.secondary).toContain("mi");
    expect(result.combined).toMatch(/^[\d.]+ km \([\d.]+ mi\)$/);
  });
});

describe("isMilesFirstLocale", () => {
  it("returns true for en-US", () => {
    expect(isMilesFirstLocale("en-US")).toBe(true);
  });

  it("returns true for en-US-POSIX", () => {
    expect(isMilesFirstLocale("en-US-POSIX")).toBe(true);
  });

  it("returns false for en-GB", () => {
    expect(isMilesFirstLocale("en-GB")).toBe(false);
  });
});

describe("buildCardioCommandCenterModel", () => {
  it("returns loading model", () => {
    const m = buildCardioCommandCenterModel({
      dataReadinessState: "loading",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("loading");
    expect(m.summary).toBeNull();
    expect(m.showWorkoutsCta).toBe(false);
  });

  it("returns invalid model with showFailuresCta true when failures exist", () => {
    const m = buildCardioCommandCenterModel({
      dataReadinessState: "invalid",
      factsDoc: null,
      hasFailures: true,
    });

    expect(m.state).toBe("invalid");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showWorkoutsCta).toBe(true);
  });

  it("returns empty model", () => {
    const m = buildCardioCommandCenterModel({
      dataReadinessState: "empty",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("empty");
    expect(m.summary).toBeNull();
    expect(m.showWorkoutsCta).toBe(true);
  });

  it("returns partial model", () => {
    const m = buildCardioCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showWorkoutsCta).toBe(true);
  });

  it("fails closed (partial) when data is ready but activity is missing", () => {
    const facts = makeFacts({});
    const m = buildCardioCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showWorkoutsCta).toBe(true);
  });

  it("returns partial when activity exists but has no metrics", () => {
    const facts = makeFacts({ activity: {} });
    const m = buildCardioCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showWorkoutsCta).toBe(true);
  });

  it("returns ready with activity metrics, description contains mi when locale en-US", () => {
    const facts = makeFacts({
      activity: {
        steps: 8000,
        moveMinutes: 45,
        distanceKm: 6.4,
        trainingLoad: 25,
      },
    });

    const m = buildCardioCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
      locale: "en-US",
    });

    expect(m.state).toBe("ready");
    expect(m.summary).not.toBeNull();
    expect(m.summary?.steps).toBe(8000);
    expect(m.summary?.moveMinutes).toBe(45);
    expect(m.summary?.distanceKm).toBe(6.4);
    expect(m.summary?.trainingLoad).toBe(25);
    expect(m.description).toContain("mi");
    expect(m.description).toContain("Today:");
    expect(m.showWorkoutsCta).toBe(false);
  });

  it("returns ready with partial metrics, only includes present values", () => {
    const facts = makeFacts({
      activity: {
        steps: 5000,
        moveMinutes: 20,
      },
    });

    const m = buildCardioCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.steps).toBe(5000);
    expect(m.summary?.moveMinutes).toBe(20);
    expect(m.summary?.distanceKm).toBeUndefined();
    expect(m.summary?.trainingLoad).toBeUndefined();
  });
});
