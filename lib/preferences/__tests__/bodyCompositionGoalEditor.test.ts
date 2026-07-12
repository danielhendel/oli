import { describe, expect, it } from "@jest/globals";

import {
  buildBodyCompositionGoalDraft,
  isMaterialTargetChange,
  parseDisplayTargetToCanonical,
} from "@/lib/preferences/bodyCompositionGoalEditor";
import type { BodyCompositionGoalV1 } from "@oli/contracts";
import { LB_PER_KG } from "@/lib/body/bodyCompositionShared";

const NOW = "2026-07-12T12:00:00.000Z";
const MEASURED = "2026-07-10T08:00:00.000Z";

describe("parseDisplayTargetToCanonical", () => {
  it("rejects empty / non-finite", () => {
    expect(parseDisplayTargetToCanonical({
      primaryMetric: "weight",
      targetDisplayText: "",
      massDisplayUnit: "lb",
    }).ok).toBe(false);
    expect(parseDisplayTargetToCanonical({
      primaryMetric: "weight",
      targetDisplayText: "abc",
      massDisplayUnit: "lb",
    }).ok).toBe(false);
  });

  it("converts lb to kg", () => {
    const r = parseDisplayTargetToCanonical({
      primaryMetric: "weight",
      targetDisplayText: String(180),
      massDisplayUnit: "lb",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeCloseTo(180 / LB_PER_KG, 6);
  });

  it("keeps body fat as percent", () => {
    const r = parseDisplayTargetToCanonical({
      primaryMetric: "bodyFat",
      targetDisplayText: "18.5",
      massDisplayUnit: "lb",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(18.5);
  });
});

describe("buildBodyCompositionGoalDraft", () => {
  it("errors when no measurement", () => {
    const r = buildBodyCompositionGoalDraft({
      primaryMetric: "weight",
      targetDisplayText: "170",
      massDisplayUnit: "lb",
      latest: null,
      existingGoal: null,
      nowIso: NOW,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("no_measurement");
  });

  it("errors when target equals baseline", () => {
    const kg = 80;
    const r = buildBodyCompositionGoalDraft({
      primaryMetric: "weight",
      targetDisplayText: String(kg),
      massDisplayUnit: "kg",
      latest: { metric: "weight", valueCanonical: kg, measuredAtIso: MEASURED },
      existingGoal: null,
      nowIso: NOW,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("target_equals_baseline");
  });

  it("creates goal with baseline from latest", () => {
    const r = buildBodyCompositionGoalDraft({
      primaryMetric: "weight",
      targetDisplayText: "75",
      massDisplayUnit: "kg",
      latest: { metric: "weight", valueCanonical: 80, measuredAtIso: MEASURED },
      existingGoal: null,
      nowIso: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiresConfirm).toBe(false);
    expect(r.goal.baselineValue).toBe(80);
    expect(r.goal.targetValue).toBe(75);
    expect(r.goal.baselineAt).toBe(MEASURED);
    expect(r.goal.unit).toBe("kg");
  });

  it("requires confirm on primary metric change", () => {
    const existing: BodyCompositionGoalV1 = {
      version: 1,
      primaryMetric: "weight",
      baselineValue: 80,
      targetValue: 75,
      unit: "kg",
      baselineAt: MEASURED,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = buildBodyCompositionGoalDraft({
      primaryMetric: "bodyFat",
      targetDisplayText: "15",
      massDisplayUnit: "kg",
      latest: { metric: "bodyFat", valueCanonical: 20, measuredAtIso: MEASURED },
      existingGoal: existing,
      nowIso: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiresConfirm).toBe(true);
    expect(r.confirmReason).toBe("primary_metric_change");
  });

  it("requires confirm on material target change", () => {
    const existing: BodyCompositionGoalV1 = {
      version: 1,
      primaryMetric: "weight",
      baselineValue: 80,
      targetValue: 75,
      unit: "kg",
      baselineAt: MEASURED,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(isMaterialTargetChange(existing, 70)).toBe(true);
    const r = buildBodyCompositionGoalDraft({
      primaryMetric: "weight",
      targetDisplayText: "70",
      massDisplayUnit: "kg",
      latest: { metric: "weight", valueCanonical: 78, measuredAtIso: MEASURED },
      existingGoal: existing,
      nowIso: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiresConfirm).toBe(true);
    expect(r.confirmReason).toBe("material_target_change");
  });

  it("applies baseline reset after confirm", () => {
    const existing: BodyCompositionGoalV1 = {
      version: 1,
      primaryMetric: "weight",
      baselineValue: 80,
      targetValue: 75,
      unit: "kg",
      baselineAt: MEASURED,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = buildBodyCompositionGoalDraft(
      {
        primaryMetric: "weight",
        targetDisplayText: "70",
        massDisplayUnit: "kg",
        latest: { metric: "weight", valueCanonical: 78, measuredAtIso: "2026-07-11T09:00:00.000Z" },
        existingGoal: existing,
        nowIso: NOW,
      },
      { confirmBaselineReset: true },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.requiresConfirm).toBe(false);
    expect(r.goal.baselineValue).toBe(78);
    expect(r.goal.targetValue).toBe(70);
  });
});
