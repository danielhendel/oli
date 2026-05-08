/**
 * Dash Body Composition card view-model — reuses {@link buildBodyOverviewInterpretations}
 * (same thresholds / markers as the Body Composition overview screen).
 */
import { describe, expect, it } from "@jest/globals";
import { defaultUserProfileMain, type UserProfileMain } from "@oli/contracts";

import type { BodyOverviewMetrics } from "@/lib/body/bodyCompositionInterpretation";
import { buildBodyOverviewInterpretations } from "@/lib/body/bodyCompositionInterpretation";
import type { InterpretationBarModel } from "@/lib/body/bodyOverviewInterpretationBar";
import {
  buildBodyCompositionDashCardModel,
  type BodyCompositionDashCardOverviewSlice,
  type BuildBodyCompositionDashCardModelInput,
} from "@/lib/data/dash/buildBodyCompositionDashCardModel";

function interpret(profile: UserProfileMain, overview: BodyOverviewMetrics) {
  return buildBodyOverviewInterpretations(profile, overview, { massDisplayUnit: "lb" });
}

function pill(displayLabel: string, hasValue = true): InterpretationBarModel {
  return {
    marker01: 0.55,
    zone: "good",
    displayLabel,
    hasValue,
  };
}

function baseInput(
  extra: Partial<BuildBodyCompositionDashCardModelInput> = {},
): BuildBodyCompositionDashCardModelInput {
  const overview: BodyCompositionDashCardOverviewSlice = {
    weightKg: 72.26,
    bodyFatPercent: 18,
    bmi: 23.1,
    leanBodyMassKg: 59.2,
    hasAnyMetric: true,
  };
  const profile = defaultUserProfileMain();
  profile.body.heightCm = 180;
  profile.identity.sexAtBirth = "male";

  return {
    seriesStatus: "ready",
    seriesError: null,
    overview,
    interpretations: interpret(profile, overview),
    massUnit: "lb",
    readingAsOfLabel: "As of today",
    ...extra,
  };
}

describe("buildBodyCompositionDashCardModel", () => {
  it("maps series error to error tag", () => {
    const r = buildBodyCompositionDashCardModel(
      baseInput({ seriesStatus: "error", seriesError: "boom" }),
    );
    expect(r).toEqual({ tag: "error", message: "boom" });
  });

  it("maps partial series to partial tag", () => {
    const r = buildBodyCompositionDashCardModel(baseInput({ seriesStatus: "partial" }));
    expect(r).toEqual({ tag: "partial" });
  });

  it("missing metrics: empty overview → missing tag + empty-state a11y seed", () => {
    const overview: BodyOverviewMetrics = {
      weightKg: null,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    };
    const profile = defaultUserProfileMain();
    const r = buildBodyCompositionDashCardModel(
      baseInput({
        overview: { ...overview, hasAnyMetric: false },
        interpretations: interpret(profile, overview),
      }),
    );
    expect(r.tag).toBe("missing");
    if (r.tag === "missing") {
      expect(r.cardAccessibilityLabel).toContain("Add body data");
    }
  });

  it("ready: formats hero-style weight and wires BMI / body fat / lean interpretation bars", () => {
    const r = buildBodyCompositionDashCardModel(baseInput());
    expect(r.tag).toBe("ready");
    if (r.tag !== "ready") throw new Error("expected ready");
    expect(r.weightPrimaryLabel).toBe("159 lb");
    expect(r.readingAsOfLabel).toBe("As of today");
    expect(r.rows.map((x) => x.key)).toEqual(["bmi", "bodyFat", "leanMass"]);
    expect(r.rows[0]?.bar.hasValue).toBe(true);
    expect(r.rows[0]?.valueLabel).toMatch(/\d+\.\d/);
    expect(r.rows[1]?.bar.hasValue).toBe(true);
    expect(r.rows[2]?.bar.hasValue).toBe(true);
  });

  it("reading label omitted from card a11y when null", () => {
    const r = buildBodyCompositionDashCardModel(baseInput({ readingAsOfLabel: null }));
    expect(r.tag).toBe("ready");
    if (r.tag !== "ready") throw new Error("expected ready");
    expect(r.cardAccessibilityLabel).not.toContain("As of today");
  });

  it("missing body fat: body-fat row shows em dash and neutral pill model", () => {
    const overview: BodyOverviewMetrics = {
      weightKg: 72.26,
      bodyFatPercent: null,
      bmi: 23.1,
      leanBodyMassKg: 59.2,
      restingMetabolicRateKcal: null,
    };
    const profile = defaultUserProfileMain();
    profile.body.heightCm = 180;
    const r = buildBodyCompositionDashCardModel(
      baseInput({
        overview: { ...overview, hasAnyMetric: true },
        interpretations: interpret(profile, overview),
      }),
    );
    expect(r.tag).toBe("ready");
    if (r.tag !== "ready") throw new Error("expected ready");
    expect(r.rows[1]?.valueLabel).toBe("—");
    expect(r.rows[1]?.bar.hasValue).toBe(false);
  });

  it("missing lean mass: lean row shows em dash and neutral pill model", () => {
    const overview: BodyOverviewMetrics = {
      weightKg: 72.26,
      bodyFatPercent: 18,
      bmi: 23.1,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
    };
    const profile = defaultUserProfileMain();
    profile.body.heightCm = 180;
    const r = buildBodyCompositionDashCardModel(
      baseInput({
        overview: { ...overview, hasAnyMetric: true },
        interpretations: interpret(profile, overview),
      }),
    );
    expect(r.tag).toBe("ready");
    if (r.tag !== "ready") throw new Error("expected ready");
    expect(r.rows[2]?.valueLabel).toBe("—");
    expect(r.rows[2]?.bar.hasValue).toBe(false);
  });

  it("missing BMI value: BMI row has no metric value (still ready card)", () => {
    const overview: BodyOverviewMetrics = {
      weightKg: 72.26,
      bodyFatPercent: 18,
      bmi: null,
      leanBodyMassKg: 59.2,
      restingMetabolicRateKcal: null,
    };
    const profile = defaultUserProfileMain();
    profile.body.heightCm = 180;
    const r = buildBodyCompositionDashCardModel(
      baseInput({
        overview: { ...overview, hasAnyMetric: true },
        interpretations: interpret(profile, overview),
      }),
    );
    expect(r.tag).toBe("ready");
    if (r.tag !== "ready") throw new Error("expected ready");
    expect(r.rows[0]?.valueLabel).toBe("—");
    expect(r.rows[0]?.bar.hasValue).toBe(false);
  });

  it("allows overriding BMI interpretation bar label fixtures", () => {
    const baseIx = interpret(defaultUserProfileMain(), {
      weightKg: 72.26,
      bodyFatPercent: 18,
      bmi: 23.1,
      leanBodyMassKg: 59.2,
      restingMetabolicRateKcal: null,
    });
    const r = buildBodyCompositionDashCardModel(
      baseInput({
        interpretations: {
          ...baseIx,
          bmi: { progress01: 0.5, subtitle: null, mode: "generic", bar: pill("Healthy") },
        },
      }),
    );
    expect(r.tag).toBe("ready");
    if (r.tag !== "ready") throw new Error("expected ready");
    expect(r.rows[0]?.bar.displayLabel).toBe("Healthy");
  });
});
