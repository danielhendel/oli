// lib/modules/__tests__/commandCenterStrength.test.ts
import { buildStrengthCommandCenterModel } from "../commandCenterStrength";
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

describe("buildStrengthCommandCenterModel", () => {
  it("returns loading model", () => {
    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "loading",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("loading");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(false);
  });

  it("returns invalid model and failures CTA when failures exist", () => {
    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "invalid",
      factsDoc: null,
      hasFailures: true,
    });

    expect(m.state).toBe("invalid");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showLogCta).toBe(true);
  });

  it("returns empty model", () => {
    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "empty",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("empty");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("returns partial model", () => {
    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("fails closed (partial) when data is ready but strength is missing", () => {
    const facts = makeFacts({});
    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("returns ready summary when strength is present", () => {
    const facts = makeFacts({
      strength: {
        workoutsCount: 1,
        totalSets: 12,
        totalReps: 96,
        totalVolumeByUnit: { lb: 12345 },
      },
    });

    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary).not.toBeNull();
    expect(m.summary?.workoutsCount).toBe(1);
    expect(m.summary?.totalSets).toBe(12);
    expect(m.summary?.totalReps).toBe(96);
    expect(m.summary?.totalVolumeByUnit.lb).toBe(12345);
    expect(m.showLogCta).toBe(false);
  });

  it("returns ready but prompts logging when workoutsCount is 0", () => {
    const facts = makeFacts({
      strength: {
        workoutsCount: 0,
        totalSets: 0,
        totalReps: 0,
        totalVolumeByUnit: {},
      },
    });

    const m = buildStrengthCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary).not.toBeNull();
    expect(m.showLogCta).toBe(true);
    expect(m.description.toLowerCase()).toContain("no strength workouts");
  });
});
