// lib/modules/__tests__/commandCenterNutrition.test.ts
import { buildNutritionCommandCenterModel } from "../commandCenterNutrition";
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

describe("buildNutritionCommandCenterModel", () => {
  it("returns loading model", () => {
    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "loading",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("loading");
    expect(m.description).toBe("Loading derived nutrition summary…");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(false);
    expect(m.showFailuresCta).toBe(false);
  });

  it("returns invalid model and failures CTA when failures exist", () => {
    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "invalid",
      factsDoc: null,
      hasFailures: true,
    });

    expect(m.state).toBe("invalid");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showLogCta).toBe(true);
  });

  it("returns empty model", () => {
    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "empty",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("empty");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("returns partial model", () => {
    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("fails closed (partial) when data is ready but nutrition is missing", () => {
    const facts = makeFacts({});
    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("returns partial when nutrition exists but has no metrics", () => {
    const facts = makeFacts({ nutrition: {} });
    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogCta).toBe(true);
  });

  it("returns ready with full nutrition metrics", () => {
    const facts = makeFacts({
      nutrition: {
        totalKcal: 1850,
        proteinG: 140,
        carbsG: 210,
        fatG: 60,
      },
    });

    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary).not.toBeNull();
    expect(m.summary?.totalKcal).toBe(1850);
    expect(m.summary?.proteinG).toBe(140);
    expect(m.summary?.carbsG).toBe(210);
    expect(m.summary?.fatG).toBe(60);
    expect(m.description).toContain("Today:");
    expect(m.description).toContain("1,850 kcal");
    expect(m.description).toContain("P 140g");
    expect(m.description).toContain("C 210g");
    expect(m.description).toContain("F 60g");
    expect(m.showLogCta).toBe(false);
  });

  it("returns ready with partial metrics, only includes present values", () => {
    const facts = makeFacts({
      nutrition: {
        totalKcal: 2200,
        proteinG: 120,
      },
    });

    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.totalKcal).toBe(2200);
    expect(m.summary?.proteinG).toBe(120);
    expect(m.summary?.carbsG).toBeUndefined();
    expect(m.summary?.fatG).toBeUndefined();
    expect(m.description).toContain("2,200 kcal");
    expect(m.description).toContain("P 120g");
    expect(m.description).not.toContain("C ");
    expect(m.description).not.toContain("F ");
  });

  it("does not display misleading zeros for missing data", () => {
    const facts = makeFacts({
      nutrition: {
        totalKcal: 1500,
        proteinG: 100,
        carbsG: 0,
        fatG: 0,
      },
    });

    const m = buildNutritionCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.totalKcal).toBe(1500);
    expect(m.summary?.proteinG).toBe(100);
    expect(m.summary?.carbsG).toBe(0);
    expect(m.summary?.fatG).toBe(0);
    expect(m.description).toContain("1,500 kcal");
    expect(m.description).toContain("P 100g");
    expect(m.description).toContain("C 0g");
    expect(m.description).toContain("F 0g");
  });
});
