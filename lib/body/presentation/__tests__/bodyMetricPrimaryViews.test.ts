import {
  resolveCompatibleFatMassKg,
  resolveCompatibleLeanMassPercentage,
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

describe("resolveCompatibleBodyCompositionDerivation", () => {
  it("fails closed for fat mass without same-event pairing", () => {
    const r = resolveCompatibleFatMassKg({
      weightKg: 80,
      bodyFatPercent: 20,
      leanBodyMassKg: null,
      weightAndBodyFatSameEvent: false,
    });
    expect(r.status).toBe("incompatible");
    expect(r.valueKg).toBeNull();
  });

  it("derives fat mass only when same-event evidence is true", () => {
    const r = resolveCompatibleFatMassKg({
      weightKg: 80,
      bodyFatPercent: 25,
      leanBodyMassKg: null,
      weightAndBodyFatSameEvent: true,
    });
    expect(r.status).toBe("ready");
    if (r.status === "ready") {
      expect(r.valueKg).toBe(20);
      expect(r.provenanceLabel).toMatch(/Calculated from compatible/);
    }
  });

  it("fails closed for lean % without same-event pairing", () => {
    const r = resolveCompatibleLeanMassPercentage({
      weightKg: 80,
      bodyFatPercent: null,
      leanBodyMassKg: 60,
      weightAndLeanSameEvent: false,
    });
    expect(r.status).toBe("incompatible");
    expect(r.percent).toBeNull();
  });

  it("derives lean % only when compatible", () => {
    const r = resolveCompatibleLeanMassPercentage({
      weightKg: 80,
      bodyFatPercent: null,
      leanBodyMassKg: 60,
      weightAndLeanSameEvent: true,
    });
    expect(r.status).toBe("ready");
    expect(r.percent).toBe(75);
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
    expect(massChart.segments.find((s) => s.id === "healthy_weight")?.formattedRange).toMatch(/lb/);
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

  it("Body Fat default percentage preserves measured value; fat mass fails closed without pairing", () => {
    const [, bodyFat] = buildBodyMetricSummaryCards({ overview, profile, unit: "lb" });
    expect(bodyFat.displayUnit).toBe("%");
    const fatMass = applyBodyFatPrimaryView({
      card: bodyFat,
      view: "fatMass",
      massDisplayUnit: "lb",
      evidence: {
        weightKg: 80,
        bodyFatPercent: 20,
        leanBodyMassKg: 60,
        weightAndBodyFatSameEvent: false,
      },
    });
    expect(fatMass.displayValue).toBeNull();
    expect(fatMass.accessibilityLabel).not.toMatch(/Essential|Athletic|Fitness|Average/i);
  });

  it("Lean Mass title and mass default; percentage fails closed without pairing", () => {
    const [, , lean] = buildBodyMetricSummaryCards({ overview, profile, unit: "kg" });
    expect(lean.title).toBe("Lean Mass");
    expect(lean.displayUnit).toBe("kg");
    const pct = applyLeanMassPrimaryView({
      card: lean,
      view: "percentage",
      massDisplayUnit: "kg",
      evidence: {
        weightKg: 80,
        bodyFatPercent: null,
        leanBodyMassKg: 60,
        weightAndLeanSameEvent: false,
      },
    });
    expect(pct.displayValue).toBeNull();
    expect(pct.accessibilityLabel).not.toMatch(/Optimal|High|ALMI|sarcopenia/i);
  });

  it("compatible lean % derives without claiming skeletal muscle", () => {
    const [, , lean] = buildBodyMetricSummaryCards({ overview, profile, unit: "lb" });
    const pct = applyLeanMassPrimaryView({
      card: lean,
      view: "percentage",
      massDisplayUnit: "lb",
      evidence: {
        weightKg: 80,
        bodyFatPercent: null,
        leanBodyMassKg: 60,
        weightAndLeanSameEvent: true,
      },
    });
    expect(pct.displayValue).toBe("75.0");
    expect(pct.accessibilityLabel).toMatch(/Not skeletal muscle/);
  });
});
