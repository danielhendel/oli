// services/functions/src/healthScore/__tests__/healthScore.v1.determinism.test.ts
// Phase 1.5 Sprint 1 — same inputs => same outputs (determinism proof)

import { describe, it, expect } from "@jest/globals";
import { computeHealthScoreV1 } from "../computeHealthScoreV1";
import type { DailyFacts } from "../../types/health";

const baseDailyFacts: DailyFacts = {
  userId: "u1",
  date: "2026-01-15",
  schemaVersion: 1,
  computedAt: "2026-01-15T12:00:00.000Z",
};

describe("computeHealthScoreV1 determinism", () => {
  it("same inputs produce identical outputs", () => {
    const today: DailyFacts = {
      ...baseDailyFacts,
      recovery: { readinessScore: 75 },
      activity: { steps: 8000 },
      nutrition: { totalKcal: 2000, proteinG: 120 },
      body: { weightKg: 72 },
    };
    const input = {
      userId: "u1",
      date: "2026-01-15" as const,
      today,
      history: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
    };

    const a = computeHealthScoreV1(input);
    const b = computeHealthScoreV1(input);

    expect(a).toEqual(b);
    expect(a.compositeScore).toBe(b.compositeScore);
    expect(a.compositeTier).toBe(b.compositeTier);
    expect(a.domainScores).toEqual(b.domainScores);
    expect(a.status).toBe(b.status);
  });

  it("different inputs produce different outputs where expected", () => {
    const withRecovery: DailyFacts = {
      ...baseDailyFacts,
      recovery: { readinessScore: 90 },
      activity: { steps: 5000 },
      body: { weightKg: 70 },
    };
    const noRecovery: DailyFacts = {
      ...baseDailyFacts,
      activity: { steps: 5000 },
      body: { weightKg: 70 },
    };

    const out1 = computeHealthScoreV1({
      userId: "u1",
      date: "2026-01-15",
      today: withRecovery,
      history: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
    });
    const out2 = computeHealthScoreV1({
      userId: "u1",
      date: "2026-01-15",
      today: noRecovery,
      history: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
    });

    expect(out1.domainScores.recovery.score).toBe(90);
    expect(out2.domainScores.recovery.score).toBe(0);
    expect(out1.compositeScore).not.toBe(out2.compositeScore);
  });

  it("composite is average of four domain scores", () => {
    const today: DailyFacts = {
      ...baseDailyFacts,
      recovery: { readinessScore: 80 },
      activity: { steps: 12000 },
      nutrition: { totalKcal: 2000, proteinG: 100, carbsG: 200, fatG: 60 },
      body: { weightKg: 75 },
    };
    const out = computeHealthScoreV1({
      userId: "u1",
      date: "2026-01-15",
      today,
      history: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
    });
    const avg =
      (out.domainScores.recovery.score +
        out.domainScores.training.score +
        out.domainScores.nutrition.score +
        out.domainScores.body.score) /
      4;
    expect(out.compositeScore).toBe(Math.round(avg));
  });

  it("insufficient_data when no domain data", () => {
    const today: DailyFacts = { ...baseDailyFacts };
    const out = computeHealthScoreV1({
      userId: "u1",
      date: "2026-01-15",
      today,
      history: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
    });
    expect(out.status).toBe("insufficient_data");
    expect(out.compositeScore).toBe(0);
  });
});
