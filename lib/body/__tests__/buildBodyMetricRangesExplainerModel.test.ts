import { describe, expect, it } from "@jest/globals";
import { defaultUserProfileMain, type UserProfileMain } from "@oli/contracts";

import { buildBodyOverviewInterpretations } from "@/lib/body/bodyCompositionInterpretation";
import type { BodyOverviewMetrics } from "@/lib/body/bodyCompositionInterpretation";
import {
  buildBodyMetricRangesExplainerVm,
  parseBodyMetricRangesExplainerMetric,
} from "@/lib/body/buildBodyMetricRangesExplainerModel";
import { bodyFatFitnessThresholds } from "@/lib/body/bodyCompositionShared";

function ix(profile: UserProfileMain, overview: BodyOverviewMetrics) {
  return buildBodyOverviewInterpretations(profile, overview, { massDisplayUnit: "lb" });
}

describe("parseBodyMetricRangesExplainerMetric", () => {
  it.each(["bmi", "bodyFat", "leanMass"] as const)("parses %s", (m) => {
    expect(parseBodyMetricRangesExplainerMetric(m)).toBe(m);
  });

  it("returns null for unknown", () => {
    expect(parseBodyMetricRangesExplainerMetric("steps")).toBeNull();
  });
});

describe("buildBodyMetricRangesExplainerVm", () => {
  const overview: BodyOverviewMetrics = {
    weightKg: 72,
    bodyFatPercent: 18,
    bmi: 23.5,
    leanBodyMassKg: 59.04,
    restingMetabolicRateKcal: 1650,
  };

  it("orders BMI content: reading, explainer title, legend rows match WHO cuts, meanings section", () => {
    const profile = defaultUserProfileMain();
    profile.identity.sexAtBirth = "male";
    profile.body.heightCm = 178;
    const vm = buildBodyMetricRangesExplainerVm("bmi", {
      profile,
      overview,
      interpretations: ix(profile, overview),
      massUnit: "lb",
    });
    expect(vm).not.toBeNull();
    expect(vm!.reading.valueLine).toContain("23.5");
    expect(vm!.reading.classificationLine).toContain("Classification:");
    expect(vm!.metricExplainer.title).toBe("What BMI tells you");
    expect(vm!.metricExplainer.paragraphs.join(" ")).toContain("muscle");
    expect(vm!.rangeLegend.heading).toContain("WHO");
    expect(vm!.rangeLegend.rows).toHaveLength(4);
    expect(vm!.rangeLegend.rows.map((r) => r.rangeLine).some((l) => l.includes("18.5"))).toBe(true);
    expect(vm!.tiers).toHaveLength(4);
    expect(vm!.rangeMeaningsHeading).toBe("What each range means");
  });

  it("body fat uses shared thresholds for labeled ranges when sex is known", () => {
    const profile = defaultUserProfileMain();
    profile.identity.sexAtBirth = "female";
    profile.bodyInputs.athleteMode = false;
    const { fitnessLo, fitnessHi, averageHi } = bodyFatFitnessThresholds("female", false);
    const vm = buildBodyMetricRangesExplainerVm("bodyFat", {
      profile,
      overview,
      interpretations: ix(profile, overview),
      massUnit: "lb",
    });
    expect(vm!.rangeLegend.rows).toHaveLength(4);
    const legendText = vm!.rangeLegend.rows.map((r) => r.rangeLine).join(" ");
    expect(legendText).toContain(String(fitnessLo));
    expect(legendText).toContain(String(fitnessHi));
    expect(legendText).toContain(String(averageHi));
    expect(vm!.metricExplainer.title).toBe("What body fat tells you");
  });

  it("lean mass explains tissues and exposes four consistency tiers", () => {
    const profile = defaultUserProfileMain();
    profile.bodyInputs.athleteMode = false;
    const vm = buildBodyMetricRangesExplainerVm("leanMass", {
      profile,
      overview,
      interpretations: ix(profile, overview),
      massUnit: "lb",
    });
    expect(vm!.metricExplainer.paragraphs.join(" ")).toMatch(/muscle|bone/i);
    expect(vm!.rangeLegend.rows).toHaveLength(4);
    expect(vm!.tiers).toHaveLength(4);
  });
});
