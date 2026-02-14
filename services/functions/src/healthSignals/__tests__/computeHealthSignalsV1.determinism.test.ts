// services/functions/src/healthSignals/__tests__/computeHealthSignalsV1.determinism.test.ts
// Phase 1.5 Sprint 4 — identical inputs → identical HealthSignalDoc (excluding computedAt)

import { describe, it, expect } from "@jest/globals";
import { computeHealthSignalsV1 } from "../computeHealthSignalsV1";
import type { HealthScoreDocForSignals } from "../computeHealthSignalsV1";
import { SIGNAL_THRESHOLDS } from "../constants";

function makeHealthScore(overrides: Partial<HealthScoreDocForSignals> = {}): HealthScoreDocForSignals {
  return {
    date: "2026-01-15",
    compositeScore: 70,
    domainScores: {
      recovery: { score: 72 },
      training: { score: 68 },
      nutrition: { score: 75 },
      body: { score: 65 },
    },
    ...overrides,
  };
}

describe("computeHealthSignalsV1 determinism", () => {
  it("identical inputs produce identical outputs (excluding computedAt)", () => {
    const healthScoreForDay = makeHealthScore();
    const history: HealthScoreDocForSignals[] = [
      makeHealthScore({ date: "2026-01-14", compositeScore: 68 }),
      makeHealthScore({ date: "2026-01-13", compositeScore: 72 }),
    ];
    const computedAt = "2026-01-15T12:00:00.000Z";
    const input = {
      dayKey: "2026-01-15" as const,
      healthScoreForDay,
      healthScoreHistory: history,
      computedAt,
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    };

    const a = computeHealthSignalsV1(input);
    const b = computeHealthSignalsV1({ ...input, computedAt: "2026-01-15T13:00:00.000Z" });

    expect(a.schemaVersion).toBe(b.schemaVersion);
    expect(a.modelVersion).toBe(b.modelVersion);
    expect(a.date).toBe(b.date);
    expect(a.status).toBe(b.status);
    expect(a.readiness).toBe(b.readiness);
    expect(a.pipelineVersion).toBe(b.pipelineVersion);
    expect(a.inputs).toEqual(b.inputs);
    expect(a.reasons).toEqual(b.reasons);
    expect(a.missingInputs).toEqual(b.missingInputs);
    expect(a.domainEvidence).toEqual(b.domainEvidence);
    expect(a.computedAt).not.toBe(b.computedAt);
  });

  it("same inputs twice produce identical canonical output", () => {
    const input = {
      dayKey: "2026-01-15" as const,
      healthScoreForDay: makeHealthScore(),
      healthScoreHistory: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    };
    const a = computeHealthSignalsV1(input);
    const b = computeHealthSignalsV1(input);
    const canonical = (doc: typeof a) => ({ ...doc, computedAt: "" });
    expect(canonical(a)).toEqual(canonical(b));
  });

  it("null healthScoreForDay produces attention_required with missingInputs", () => {
    const out = computeHealthSignalsV1({
      dayKey: "2026-01-15",
      healthScoreForDay: null,
      healthScoreHistory: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    });
    expect(out.status).toBe("attention_required");
    expect(out.readiness).toBe("missing");
    expect(out.missingInputs).toContain("health_score");
    expect(out.reasons).toContain("missing_health_score");
  });
});
