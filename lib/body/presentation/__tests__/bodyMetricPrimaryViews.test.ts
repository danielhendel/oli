import {
  resolveBodyFatWeightPairing,
  resolveCompatibleFatMassKg,
  resolveCompatibleLeanMassPercentage,
  resolveLeanMassWeightPairing,
} from "@/lib/body/presentation/resolveCompatibleBodyCompositionDerivation";
import {
  presentWeightClassificationChartForView,
  presentWeightFaceValue,
} from "@/lib/body/presentation/presentWeightClassificationForView";
import {
  applyBodyFatPrimaryView,
  applyLeanMassPrimaryView,
  applyWeightPrimaryView,
} from "@/lib/body/presentation/applyBodyMetricPrimaryView";
import { buildBodyMetricSummaryCards } from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { resolveWeightBmiScreeningPresentation } from "@/lib/body/standards/resolveBodyMetricStandardPresentation";
import { bmiFromWeightAndHeight } from "@/lib/body/standards/cdcWhoAdultBmiScreeningStandard";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";
import { LB_PER_KG } from "@/lib/body/bodyCompositionShared";

describe("resolveCompatibleBodyCompositionDerivation", () => {
  it("fails closed for fat mass without overview day or stronger pairing", () => {
    const r = resolveCompatibleFatMassKg({
      weightKg: 80,
      bodyFatPercent: 20,
      leanBodyMassKg: null,
    });
    expect(r.status).toBe("incompatible");
    expect(r.valueKg).toBeNull();
    expect(r.reason).toMatch(/compatible Weight/i);
  });

  it("accepts approved Body overview snapshot-day pairing for fat mass", () => {
    const pairing = resolveBodyFatWeightPairing({
      weightKg: 74.298, // ~163.8 lb
      bodyFatPercent: 18.2,
      leanBodyMassKg: null,
      overviewDay: "2026-09-19",
      latestObservedAtIso: "2026-09-19T15:00:00.000Z",
    });
    expect(pairing.status).toBe("compatible");
    if (pairing.status === "compatible") {
      expect(pairing.compatibilityBasis).toBe("existing_approved_pairing_rule");
    }
    const r = resolveCompatibleFatMassKg({
      weightKg: 74.298,
      bodyFatPercent: 18.2,
      leanBodyMassKg: null,
      overviewDay: "2026-09-19",
    });
    expect(r.status).toBe("ready");
    if (r.status === "ready") {
      const displayLb = Number((r.valueKg * LB_PER_KG).toFixed(1));
      expect(displayLb).toBeCloseTo(29.8, 0);
      expect(r.provenanceLabel).toMatch(/Calculated from compatible/);
    }
  });

  it("same-event flag is stronger than snapshot day", () => {
    const pairing = resolveBodyFatWeightPairing({
      weightKg: 80,
      bodyFatPercent: 25,
      leanBodyMassKg: null,
      overviewDay: "2026-09-19",
      weightAndBodyFatSameEvent: true,
    });
    expect(pairing.status).toBe("compatible");
    if (pairing.status === "compatible") {
      expect(pairing.compatibilityBasis).toBe("same_measurement_group");
    }
  });

  it("same source + identical timestamp pairs without inventing a window", () => {
    const pairing = resolveLeanMassWeightPairing({
      weightKg: 80,
      bodyFatPercent: null,
      leanBodyMassKg: 60,
      weightObservedAt: "2026-09-19T12:00:00.000Z",
      leanObservedAt: "2026-09-19T12:00:00.000Z",
      weightSourceId: "apple_health",
      leanSourceId: "apple_health",
    });
    expect(pairing.status).toBe("compatible");
    if (pairing.status === "compatible") {
      expect(pairing.compatibilityBasis).toBe("same_origin_and_timestamp");
    }
  });

  it("different sources with timestamps withhold", () => {
    const pairing = resolveBodyFatWeightPairing({
      weightKg: 80,
      bodyFatPercent: 20,
      leanBodyMassKg: null,
      weightObservedAt: "2026-09-19T12:00:00.000Z",
      bodyFatObservedAt: "2026-09-19T12:00:00.000Z",
      weightSourceId: "withings",
      bodyFatSourceId: "apple_health",
    });
    expect(pairing.status).toBe("different_origin");
  });

  it("rejects zero/negative weight and non-finite inputs", () => {
    expect(
      resolveCompatibleFatMassKg({
        weightKg: 0,
        bodyFatPercent: 18,
        leanBodyMassKg: null,
        overviewDay: "2026-09-19",
      }).status,
    ).toBe("missing");
    expect(
      resolveCompatibleFatMassKg({
        weightKg: Number.NaN,
        bodyFatPercent: 18,
        leanBodyMassKg: null,
        overviewDay: "2026-09-19",
      }).status,
    ).toBe("missing");
  });

  it("derives lean % from snapshot-day pairing (~81.8% for physical fixture)", () => {
    const weightKg = 163.8 / LB_PER_KG;
    const leanKg = 134 / LB_PER_KG;
    const r = resolveCompatibleLeanMassPercentage({
      weightKg,
      bodyFatPercent: null,
      leanBodyMassKg: leanKg,
      overviewDay: "2026-09-19",
    });
    expect(r.status).toBe("ready");
    expect(r.percent != null ? Number(r.percent.toFixed(1)) : null).toBeCloseTo(81.8, 0);
  });

  it("lean mass greater than weight is conflicting", () => {
    const pairing = resolveLeanMassWeightPairing({
      weightKg: 70,
      bodyFatPercent: null,
      leanBodyMassKg: 80,
      overviewDay: "2026-09-19",
    });
    expect(pairing.status).toBe("conflicting");
  });

  it("missing weight withholds lean percentage with consumer-safe reason", () => {
    const r = resolveCompatibleLeanMassPercentage({
      weightKg: null,
      bodyFatPercent: null,
      leanBodyMassKg: 60,
      overviewDay: "2026-09-19",
    });
    expect(r.status).toBe("missing");
    expect(r.reason).toMatch(/compatible Weight/i);
  });
});

describe("Weight mass | BMI presentation", () => {
  const base = {
    overviewDay: "2026-03-31",
    weightKg: 74.3,
    bodyFatPercent: 18,
    leanBodyMassKg: 55,
    bmi: null as number | null,
    hasAnyMetric: true,
    latestObservedAtIso: "2026-03-31T08:00:00.000Z",
  };
  const profile = {
    heightCm: 170,
    ageYears: 36,
    sex: "female" as const,
  };

  it("mass and BMI views share one classification segment", () => {
    const resolveInput = {
      metric: "weight" as const,
      weightKg: base.weightKg,
      bodyFatPercent: base.bodyFatPercent,
      leanBodyMassKg: base.leanBodyMassKg,
      bmi: null,
      heightCm: profile.heightCm,
      ageYears: profile.ageYears,
      sex: profile.sex,
      measurementMethod: "height_and_weight",
      massDisplayUnit: "lb" as const,
    };
    const presentation = resolveWeightBmiScreeningPresentation(resolveInput);
    expect(presentation?.classifiedId).toBeTruthy();
    const massChart = presentWeightClassificationChartForView({
      presentation: presentation!,
      view: "mass",
      weightKg: base.weightKg,
      bmi: bmiFromWeightAndHeight(base.weightKg, profile.heightCm),
      massDisplayUnit: "lb",
    });
    const bmiChart = presentWeightClassificationChartForView({
      presentation: presentation!,
      view: "bmi",
      weightKg: base.weightKg,
      bmi: bmiFromWeightAndHeight(base.weightKg, profile.heightCm),
      massDisplayUnit: "lb",
    });
    expect(massChart.marker?.segmentId).toBe(bmiChart.marker?.segmentId);
    expect(massChart.marker?.withinSegmentPosition).toBe(bmiChart.marker?.withinSegmentPosition);
    expect(bmiChart.segments.find((s) => s.id === "healthy_weight")?.formattedRange).toBe(
      "18.5–24.9",
    );
  });

  it("BMI face withholds when height missing", () => {
    const face = presentWeightFaceValue({
      view: "bmi",
      weightKg: 74,
      bmi: null,
      massDisplayUnit: "lb",
    });
    expect(face.displayValue).toBeNull();
    expect(face.unavailableReason).toMatch(/height/i);
  });

  it("BMI boundary classification stays contiguous", () => {
    const cases: { bmi: number; id: string }[] = [
      { bmi: 18.49, id: "underweight" },
      { bmi: 18.5, id: "healthy_weight" },
      { bmi: 24.9, id: "healthy_weight" },
      { bmi: 25.0, id: "overweight" },
      { bmi: 29.9, id: "overweight" },
      { bmi: 30.0, id: "obesity" },
    ];
    for (const c of cases) {
      const h = 1.7;
      const weightKg = c.bmi * h * h;
      const presentation = resolveWeightBmiScreeningPresentation({
        metric: "weight",
        weightKg,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: c.bmi,
        heightCm: 170,
        ageYears: 30,
        sex: "male",
        measurementMethod: "height_and_weight",
        massDisplayUnit: "kg",
      });
      expect(presentation?.classifiedId).toBe(c.id);
    }
  });

  it("applies weight view without inventing zero", () => {
    const [weightCard] = buildBodyMetricSummaryCards({
      overview: { ...base, weightKg: null, bmi: null, hasAnyMetric: false },
      profile,
      unit: "lb",
    });
    const applied = applyWeightPrimaryView({
      card: weightCard,
      view: "bmi",
      resolveInput: {
        metric: "weight",
        weightKg: null,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: null,
        heightCm: profile.heightCm,
        ageYears: profile.ageYears,
        sex: profile.sex,
        measurementMethod: "height_and_weight",
        massDisplayUnit: "lb",
      },
    });
    expect(applied.displayValue).toBeNull();
    expect(applied.accessibilityLabel).not.toMatch(/\b0\b/);
  });
});

describe("Body Fat and Lean Mass display views", () => {
  const overview = {
    overviewDay: "2026-03-31",
    weightKg: 80,
    bodyFatPercent: 20,
    leanBodyMassKg: 60,
    bmi: 25,
    hasAnyMetric: true,
  };
  const profile = { heightCm: 170, ageYears: 30, sex: "male" as const };

  it("Body Fat fat-mass view uses snapshot-day pairing and marks calculated", () => {
    const [, bodyFat] = buildBodyMetricSummaryCards({ overview, profile, unit: "lb" });
    const fatMass = applyBodyFatPrimaryView({
      card: bodyFat,
      view: "fatMass",
      massDisplayUnit: "lb",
      evidence: {
        weightKg: 80,
        bodyFatPercent: 20,
        leanBodyMassKg: 60,
        overviewDay: "2026-03-31",
      },
    });
    expect(fatMass.displayValue).not.toBeNull();
    expect(fatMass.formattedValue).toBe(formatBodyWeight(16, "lb"));
    expect(fatMass.accessibilityLabel).toMatch(/Calculated/);
    expect(fatMass.accessibilityLabel).not.toMatch(/Essential|Athletic|Fitness|Average/i);
    expect(bodyFat.classificationChart).toBeNull();
    expect(bodyFat.educationalReferenceChart).not.toBeNull();
    expect(bodyFat.educationalReferenceChart!.personalMarker).toBeNull();
    expect(bodyFat.showUnclassifiedScaffold).toBe(false);
  });

  it("Body Fat fat mass unavailable without pairing explains need for Weight", () => {
    const [, bodyFat] = buildBodyMetricSummaryCards({ overview, profile, unit: "lb" });
    const fatMass = applyBodyFatPrimaryView({
      card: bodyFat,
      view: "fatMass",
      massDisplayUnit: "lb",
      evidence: {
        weightKg: 80,
        bodyFatPercent: 20,
        leanBodyMassKg: 60,
      },
    });
    expect(fatMass.displayValue).toBeNull();
    expect(fatMass.accessibilityLabel).toMatch(/compatible Weight/i);
  });

  it("Lean Mass percentage uses snapshot-day pairing without ALMI claims", () => {
    const [, , lean] = buildBodyMetricSummaryCards({ overview, profile, unit: "kg" });
    expect(lean.title).toBe("Lean Mass");
    const pct = applyLeanMassPrimaryView({
      card: lean,
      view: "percentage",
      massDisplayUnit: "kg",
      evidence: {
        weightKg: 80,
        bodyFatPercent: null,
        leanBodyMassKg: 60,
        overviewDay: "2026-03-31",
      },
    });
    expect(pct.displayValue).toBe("75.0");
    expect(pct.accessibilityLabel).toMatch(/Not skeletal muscle/);
    expect(pct.accessibilityLabel).not.toMatch(/Optimal|High|ALMI|sarcopenia/i);
    expect(lean.classificationChart).toBeNull();
  });
});
