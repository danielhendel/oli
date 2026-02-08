// lib/modules/__tests__/commandCenterBody.test.ts
import {
  buildBodyCommandCenterModel,
  formatWeightDualDisplay,
  isLbsFirstLocale,
} from "../commandCenterBody";
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

describe("formatWeightDualDisplay", () => {
  it("returns lbs-first for en-US", () => {
    const result = formatWeightDualDisplay({ weightKg: 79.4, locale: "en-US" });
    expect(result.primary).toContain("lb");
    expect(result.secondary).toContain("kg");
    expect(result.combined).toMatch(/^[\d.]+ lb \([\d.]+ kg\)$/);
  });

  it("returns kg-first for en-GB", () => {
    const result = formatWeightDualDisplay({ weightKg: 79.4, locale: "en-GB" });
    expect(result.primary).toContain("kg");
    expect(result.secondary).toContain("lb");
    expect(result.combined).toMatch(/^[\d.]+ kg \([\d.]+ lb\)$/);
  });
});

describe("isLbsFirstLocale", () => {
  it("returns true for en-US", () => {
    expect(isLbsFirstLocale("en-US")).toBe(true);
  });

  it("returns true for en-US-POSIX", () => {
    expect(isLbsFirstLocale("en-US-POSIX")).toBe(true);
  });

  it("returns false for en-GB", () => {
    expect(isLbsFirstLocale("en-GB")).toBe(false);
  });
});

describe("buildBodyCommandCenterModel", () => {
  it("returns partial model", () => {
    const m = buildBodyCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.description).toContain("still building");
    expect(m.summary).toBeNull();
    expect(m.showLogWeightCta).toBe(true);
    expect(m.showFailuresCta).toBe(false);
  });

  it("returns error model and failures CTA when failures exist", () => {
    const m = buildBodyCommandCenterModel({
      dataReadinessState: "error",
      factsDoc: null,
      hasFailures: true,
    });

    expect(m.state).toBe("error");
    expect(m.showLogWeightCta).toBe(true);
    expect(m.showFailuresCta).toBe(true);
  });

  it("returns missing model", () => {
    const m = buildBodyCommandCenterModel({
      dataReadinessState: "missing",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("missing");
    expect(m.summary).toBeNull();
    expect(m.showLogWeightCta).toBe(true);
  });

  it("returns partial model", () => {
    const m = buildBodyCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogWeightCta).toBe(true);
  });

  it("fails closed (partial) when data is ready but body is missing", () => {
    const facts = makeFacts({});
    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogWeightCta).toBe(true);
  });

  it("returns partial when body exists but has no metrics", () => {
    const facts = makeFacts({ body: {} });
    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showLogWeightCta).toBe(true);
  });

  it("returns ready with full body metrics, description shows dual display for US locale", () => {
    const facts = makeFacts({
      body: {
        weightKg: 79.4,
        bodyFatPercent: 15.2,
      },
    });

    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
      locale: "en-US",
    });

    expect(m.state).toBe("ready");
    expect(m.summary).not.toBeNull();
    expect(m.summary?.weightKg).toBe(79.4);
    expect(m.summary?.bodyFatPercent).toBe(15.2);
    expect(m.description).toContain("Today:");
    expect(m.description).toContain("lb");
    expect(m.description).toContain("kg");
    expect(m.description).toContain("15.2%");
    expect(m.showLogWeightCta).toBe(false);
  });

  it("returns ready with partial metrics, only includes present values", () => {
    const facts = makeFacts({
      body: {
        weightKg: 79.4,
      },
    });

    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.weightKg).toBe(79.4);
    expect(m.summary?.bodyFatPercent).toBeUndefined();
    expect(m.description).toContain("Weight");
    expect(m.description).not.toContain("Body fat");
  });

  it("returns ready with body fat only", () => {
    const facts = makeFacts({
      body: {
        bodyFatPercent: 18.5,
      },
    });

    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.weightKg).toBeUndefined();
    expect(m.summary?.bodyFatPercent).toBe(18.5);
    expect(m.description).toContain("18.5%");
    expect(m.description).not.toContain("Weight");
  });

  it("does not display misleading zeros for missing data", () => {
    const facts = makeFacts({
      body: {
        weightKg: 79.4,
      },
    });

    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.weightKg).toBe(79.4);
    expect(m.summary?.bodyFatPercent).toBeUndefined();
    expect(m.description).not.toContain("0%");
  });

  it("shows failures CTA when hasFailures is true and state is ready", () => {
    const facts = makeFacts({
      body: {
        weightKg: 79.4,
        bodyFatPercent: 15.2,
      },
    });

    const m = buildBodyCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: true,
    });

    expect(m.state).toBe("ready");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showLogWeightCta).toBe(false);
  });
});
