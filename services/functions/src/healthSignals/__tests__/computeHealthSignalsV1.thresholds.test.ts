// services/functions/src/healthSignals/__tests__/computeHealthSignalsV1.thresholds.test.ts
// Phase 1.5 Sprint 4 — threshold boundary tests (composite, domain, deviation)

import { describe, it, expect } from "@jest/globals";
import { computeHealthSignalsV1 } from "../computeHealthSignalsV1";
import type { HealthScoreDocForSignals } from "../computeHealthSignalsV1";
import {
  COMPOSITE_ATTENTION_LT,
  DOMAIN_ATTENTION_LT,
  DEVIATION_ATTENTION_PCT_LT,
  SIGNAL_THRESHOLDS,
} from "../constants";

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

describe("computeHealthSignalsV1 thresholds", () => {
  it("composite just below threshold yields attention_required", () => {
    const out = computeHealthSignalsV1({
      dayKey: "2026-01-15",
      healthScoreForDay: makeHealthScore({ compositeScore: COMPOSITE_ATTENTION_LT - 1 }),
      healthScoreHistory: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    });
    expect(out.status).toBe("attention_required");
    expect(out.reasons).toContain("composite_below_threshold");
  });

  it("composite at threshold boundary is stable", () => {
    const out = computeHealthSignalsV1({
      dayKey: "2026-01-15",
      healthScoreForDay: makeHealthScore({ compositeScore: COMPOSITE_ATTENTION_LT }),
      healthScoreHistory: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    });
    expect(out.status).toBe("stable");
    expect(out.reasons).not.toContain("composite_below_threshold");
  });

  it("domain just below threshold yields attention_required", () => {
    const out = computeHealthSignalsV1({
      dayKey: "2026-01-15",
      healthScoreForDay: makeHealthScore({
        domainScores: {
          recovery: { score: DOMAIN_ATTENTION_LT - 1 },
          training: { score: 70 },
          nutrition: { score: 70 },
          body: { score: 70 },
        },
      }),
      healthScoreHistory: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    });
    expect(out.status).toBe("attention_required");
    expect(out.reasons).toContain("domain_recovery_below_threshold");
  });

  it("deviation below threshold yields attention_required", () => {
    const baselineComposite = 80;
    const todayComposite = 65;
    const deviationPct = (todayComposite - baselineComposite) / baselineComposite;
    expect(deviationPct).toBeLessThan(DEVIATION_ATTENTION_PCT_LT);

    const history: HealthScoreDocForSignals[] = [
      makeHealthScore({ date: "2026-01-14", compositeScore: 80, domainScores: { recovery: { score: 80 }, training: { score: 80 }, nutrition: { score: 80 }, body: { score: 80 } } }),
      makeHealthScore({ date: "2026-01-13", compositeScore: 80, domainScores: { recovery: { score: 80 }, training: { score: 80 }, nutrition: { score: 80 }, body: { score: 80 } } }),
    ];
    const out = computeHealthSignalsV1({
      dayKey: "2026-01-15",
      healthScoreForDay: makeHealthScore({
        compositeScore: todayComposite,
        domainScores: { recovery: { score: 65 }, training: { score: 65 }, nutrition: { score: 65 }, body: { score: 65 } },
      }),
      healthScoreHistory: history,
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    });
    expect(out.status).toBe("attention_required");
    expect(out.reasons).toContain("composite_deviation_below_threshold");
  });

  it("all above thresholds yields stable", () => {
    const out = computeHealthSignalsV1({
      dayKey: "2026-01-15",
      healthScoreForDay: makeHealthScore({
        compositeScore: 75,
        domainScores: {
          recovery: { score: 70 },
          training: { score: 72 },
          nutrition: { score: 78 },
          body: { score: 80 },
        },
      }),
      healthScoreHistory: [],
      computedAt: "2026-01-15T12:00:00.000Z",
      pipelineVersion: 1,
      thresholds: SIGNAL_THRESHOLDS,
    });
    expect(out.status).toBe("stable");
    expect(out.reasons).toHaveLength(0);
  });
});
