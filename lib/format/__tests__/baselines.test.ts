import {
  getGeneralBaselineContent,
  getPersonalBaselineContent,
  getOptimizationBaselineContent,
} from "../baselines";
import type { HealthScoreDoc } from "@/lib/contracts";

function makeDoc(overrides?: Partial<HealthScoreDoc>): HealthScoreDoc {
  return {
    schemaVersion: 1,
    modelVersion: "1.0",
    date: "2025-02-13",
    compositeScore: 72,
    compositeTier: "good",
    domainScores: {
      recovery: { score: 80, tier: "good", missing: [] },
      training: { score: 70, tier: "good", missing: [] },
      nutrition: { score: 65, tier: "fair", missing: ["meals"] },
      body: { score: 72, tier: "good", missing: [] },
    },
    status: "stable",
    computedAt: "2025-02-13T14:00:00.000Z",
    pipelineVersion: 1,
    inputs: { hasDailyFacts: true, historyDaysUsed: 7 },
    ...overrides,
  };
}

describe("getGeneralBaselineContent", () => {
  it("returns date, computedAt, status from doc", () => {
    const doc = makeDoc();
    const out = getGeneralBaselineContent(doc);
    expect(out.date).toBe("2025-02-13");
    expect(out.computedAt).toBeDefined();
    expect(out.status).toBe("Stable");
  });

  it("formats status variants", () => {
    expect(getGeneralBaselineContent(makeDoc({ status: "attention_required" })).status).toBe(
      "Attention required",
    );
    expect(getGeneralBaselineContent(makeDoc({ status: "insufficient_data" })).status).toBe(
      "Insufficient data",
    );
  });
});

describe("getPersonalBaselineContent", () => {
  it("returns inputs summary from doc", () => {
    const doc = makeDoc();
    const out = getPersonalBaselineContent(doc);
    expect(out.historyDaysUsed).toBe(7);
    expect(out.hasDailyFacts).toBe(true);
  });

  it("reflects doc.inputs changes", () => {
    const out = getPersonalBaselineContent(
      makeDoc({ inputs: { hasDailyFacts: false, historyDaysUsed: 0 } }),
    );
    expect(out.historyDaysUsed).toBe(0);
    expect(out.hasDailyFacts).toBe(false);
  });
});

describe("getOptimizationBaselineContent", () => {
  it("returns model and pipeline context from doc", () => {
    const doc = makeDoc();
    const out = getOptimizationBaselineContent(doc);
    expect(out.modelVersion).toBe("1.0");
    expect(out.pipelineVersion).toBe(1);
    expect(out.schemaVersion).toBe(1);
  });
});
