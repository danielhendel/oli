import { describe, expect, it } from "@jest/globals";

import type { DailyFactsDto } from "@/lib/contracts";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import {
  buildDailyEnergyMetricExplainerVm,
  collectDailyEnergyExplainerContext,
  parseDailyEnergyExplainerMetric,
} from "@/lib/metrics/dailyEnergyMetricExplainerModel";

describe("parseDailyEnergyExplainerMetric", () => {
  it.each(["baseline", "steps", "cardio", "strength"] as const)("parses %s", (m) => {
    expect(parseDailyEnergyExplainerMetric(m)).toBe(m);
  });

  it("returns null for invalid keys", () => {
    expect(parseDailyEnergyExplainerMetric("bmr")).toBeNull();
  });
});

describe("buildDailyEnergyMetricExplainerVm", () => {
  const energy: DailyEnergyCardDto = {
    modelVersion: "daily_energy_v3",
    computedAt: "2026-05-05T12:00:00.000Z",
    day: "2026-05-05",
    estimatedKcal: { low: 2120, high: 2480, midpoint: 2300 },
    variancePct: 0.081,
    confidence: "moderate",
    factors: {
      baseline: {
        kcalLow: 1520,
        kcalHigh: 1710,
        confidence: "high",
        inputsUsed: ["body.leanBodyMassKg"],
      },
    },
    missingRequiredInputs: [],
  };

  const facts = {
    energyInfluencers: {},
    activity: { steps: 9000 },
  } as unknown as DailyFactsDto;

  it("produces ordered modal VM from baseline factor context", () => {
    const ctx = collectDailyEnergyExplainerContext({
      metric: "baseline",
      energy,
      facts,
    });
    expect(ctx).not.toBeNull();
    const vm = buildDailyEnergyMetricExplainerVm({ metric: "baseline", ctx: ctx! });
    expect(vm).not.toBeNull();
    expect(vm!.navigationTitle).toBe("BMR");
    expect(vm!.readingLines[0]).toContain("Today’s estimate");
    expect(vm!.readingLines.some((l) => l.includes("Lean mass"))).toBe(true);
    expect(vm!.metricExplainerTitle.toLowerCase()).toContain("basal");
    expect(vm!.rangeLegendRows.length).toBeGreaterThanOrEqual(4);
    expect(vm!.tierMeanings.length).toEqual(vm!.rangeLegendRows.length);
  });
});
