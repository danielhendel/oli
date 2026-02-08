// lib/modules/__tests__/commandCenterRecovery.test.ts
import { buildRecoveryCommandCenterModel } from "../commandCenterRecovery";
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

describe("buildRecoveryCommandCenterModel", () => {
  it("returns partial model", () => {
    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.description).toContain("still building");
    expect(m.summary).toBeNull();
    expect(m.showReadinessCta).toBe(true);
    expect(m.showFailuresCta).toBe(false);
  });

  it("returns error model and failures CTA when failures exist", () => {
    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "error",
      factsDoc: null,
      hasFailures: true,
    });

    expect(m.state).toBe("error");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showReadinessCta).toBe(true);
  });

  it("returns missing model", () => {
    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "missing",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("missing");
    expect(m.summary).toBeNull();
    expect(m.showReadinessCta).toBe(true);
  });

  it("returns partial model", () => {
    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "partial",
      factsDoc: null,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showReadinessCta).toBe(true);
  });

  it("fails closed (partial) when data is ready but recovery is missing", () => {
    const facts = makeFacts({});
    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showReadinessCta).toBe(true);
  });

  it("returns partial when recovery exists but has no metrics", () => {
    const facts = makeFacts({ recovery: {} });
    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("partial");
    expect(m.summary).toBeNull();
    expect(m.showReadinessCta).toBe(true);
  });

  it("returns ready with full recovery metrics", () => {
    const facts = makeFacts({
      recovery: {
        hrvRmssd: 52.1,
        hrvRmssdBaseline: 48.6,
        hrvRmssdDeviation: 3.5,
      },
    });

    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary).not.toBeNull();
    expect(m.summary?.hrvRmssd).toBe(52.1);
    expect(m.summary?.hrvRmssdBaseline).toBe(48.6);
    expect(m.summary?.hrvRmssdDeviation).toBe(3.5);
    expect(m.description).toContain("Today:");
    expect(m.description).toContain("HRV 52.1");
    expect(m.description).toContain("Baseline 48.6");
    expect(m.description).toContain("Δ +3.5");
    expect(m.showReadinessCta).toBe(false);
  });

  it("returns ready with partial metrics, only includes present values", () => {
    const facts = makeFacts({
      recovery: {
        hrvRmssd: 52.1,
        hrvRmssdBaseline: 48.6,
      },
    });

    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.hrvRmssd).toBe(52.1);
    expect(m.summary?.hrvRmssdBaseline).toBe(48.6);
    expect(m.summary?.hrvRmssdDeviation).toBeUndefined();
    expect(m.description).toContain("HRV 52.1");
    expect(m.description).toContain("Baseline 48.6");
    expect(m.description).not.toContain("Δ ");
  });

  it("formats negative deviation with sign", () => {
    const facts = makeFacts({
      recovery: {
        hrvRmssd: 45.2,
        hrvRmssdBaseline: 48.6,
        hrvRmssdDeviation: -3.4,
      },
    });

    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.hrvRmssdDeviation).toBe(-3.4);
    expect(m.description).toContain("Δ -3.4");
  });

  it("does not display misleading zeros for missing data", () => {
    const facts = makeFacts({
      recovery: {
        hrvRmssd: 52.1,
      },
    });

    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: false,
    });

    expect(m.state).toBe("ready");
    expect(m.summary?.hrvRmssd).toBe(52.1);
    expect(m.summary?.hrvRmssdBaseline).toBeUndefined();
    expect(m.summary?.hrvRmssdDeviation).toBeUndefined();
    expect(m.description).toContain("HRV 52.1");
    expect(m.description).not.toContain("0");
  });

  it("shows failures CTA when hasFailures is true and state is ready", () => {
    const facts = makeFacts({
      recovery: {
        hrvRmssd: 52.1,
        hrvRmssdBaseline: 48.6,
        hrvRmssdDeviation: 3.5,
      },
    });

    const m = buildRecoveryCommandCenterModel({
      dataReadinessState: "ready",
      factsDoc: facts,
      hasFailures: true,
    });

    expect(m.state).toBe("ready");
    expect(m.showFailuresCta).toBe(true);
    expect(m.showReadinessCta).toBe(false);
  });
});
