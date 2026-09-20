import {
  BODY_COMPOSITION_SUMMARY_COPY,
  buildBodyMetricSummaryCards,
} from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import {
  assertCdcWhoHeightWeightRangesContiguous,
  buildCdcWhoHeightWeightDisplayTicks,
  formatCdcWhoWeightRangeForClass,
} from "@/lib/body/standards/cdcWhoHeightWeightRangeDisplay";

const adultProfile = {
  heightCm: 170,
  ageYears: 30,
  sex: "female" as const,
};

describe("buildBodyMetricSummaryCards — visual classification", () => {
  it("returns exactly three cards in Weight → Body Fat → Lean Mass order", () => {
    const cards = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: null,
        weightKg: null,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: null,
        hasAnyMetric: false,
      },
      profile: adultProfile,
      unit: "lb",
    });
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.metric)).toEqual(["weight", "bodyFat", "leanTissue"]);
    expect(BODY_COMPOSITION_SUMMARY_COPY.purpose).toBeNull();
  });

  it("never renders missing values as zero", () => {
    const cards = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: null,
        weightKg: null,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: null,
        hasAnyMetric: false,
      },
      profile: adultProfile,
      unit: "lb",
    });
    for (const card of cards) {
      expect(card.value).toBeNull();
      expect(card.formattedValue).toBeNull();
    }
  });

  it("builds Weight categorical chart with exact labels and height-specific ranges", () => {
    const [weight] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 70,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: 24.2,
        hasAnyMetric: true,
      },
      profile: adultProfile,
      unit: "kg",
    });
    expect(weight.featured).toBe(true);
    expect(weight.statusLabel).toBe("");
    expect(weight.referenceContextLabel).toMatch(/Adult BMI screening/i);
    expect(weight.classificationChart).not.toBeNull();
    expect(weight.classificationChart!.segments.map((s) => s.label)).toEqual([
      "Underweight",
      "Healthy Weight",
      "Overweight",
      "Obesity",
    ]);
    expect(weight.classificationChart!.marker).not.toBeNull();
    expect(weight.classificationChart!.marker!.segmentId).toBe("healthy_weight");
    const ranges = weight.classificationChart!.segments.map((s) => s.formattedRange);
    expect(ranges.every((r) => typeof r === "string" && r.length > 0)).toBe(true);
    expect(JSON.stringify(weight)).not.toMatch(/ideal weight|Optimal|Excellence|Target|Below|Reference unavailable|No measurement yet|Personal screening placement unavailable/i);
    // standardId lives in the typed model for detail/accessibility — not as visible card chrome copy.
    expect(weight.statusLabel).toBe("");
    expect(weight.referenceLabel).toBeNull();
  });

  it("keeps Weight chart without marker when weight missing but height+age apply", () => {
    const [weight] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: null,
        weightKg: null,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: null,
        hasAnyMetric: false,
      },
      profile: adultProfile,
      unit: "lb",
    });
    expect(weight.classificationChart).not.toBeNull();
    expect(weight.classificationChart!.marker).toBeNull();
    expect(weight.formattedValue).toBeNull();
    expect(weight.accessibilityLabel).toMatch(/No current measurement/i);
  });

  it("omits personalized ranges and marker without height", () => {
    const [weight] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 70,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: 24.2,
        hasAnyMetric: true,
      },
      profile: { heightCm: null, ageYears: 30, sex: "female" },
      unit: "kg",
    });
    expect(weight.classificationChart).not.toBeNull();
    expect(weight.classificationChart!.marker).toBeNull();
    expect(weight.classificationChart!.segments.every((s) => s.formattedRange == null)).toBe(true);
  });

  it("withholds adult Weight chart under age 20", () => {
    const [weight] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 70,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: 24.2,
        hasAnyMetric: true,
      },
      profile: { heightCm: 170, ageYears: 19, sex: "female" },
      unit: "kg",
    });
    expect(weight.classificationChart).toBeNull();
  });

  it("preserves Weight CDC/WHO classification chart visual contract", () => {
    const [weight] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: 18,
        leanBodyMassKg: 60,
        bmi: 24.2,
        hasAnyMetric: true,
      },
      profile: adultProfile,
      unit: "lb",
    });
    expect(weight.classificationChart).not.toBeNull();
    expect(weight.educationalReferenceChart).toBeNull();
    expect(weight.showUnclassifiedScaffold).toBe(false);
    expect(weight.classificationChart!.segments.map((s) => s.label)).toEqual([
      "Underweight",
      "Healthy Weight",
      "Overweight",
      "Obesity",
    ]);
    expect(weight.classificationChart!.marker).not.toBeNull();
  });

  it("shows Body Fat composition-share graph without classification essays", () => {
    const [, bodyFat] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: 18,
        leanBodyMassKg: null,
        bmi: null,
        hasAnyMetric: true,
      },
      profile: adultProfile,
      unit: "lb",
    });
    expect(bodyFat.formattedValue).toBe("18.0%");
    expect(bodyFat.displayValue).toBe("18.0");
    expect(bodyFat.classificationChart).toBeNull();
    expect(bodyFat.educationalReferenceChart).toBeNull();
    expect(bodyFat.compositionShareGraph).not.toBeNull();
    expect(bodyFat.compositionShareGraph!.kind).toBe("composition_share");
    expect(bodyFat.compositionShareGraph!.personalClassification).toBeNull();
    expect(bodyFat.compositionShareGraph!.target).toBeNull();
    expect(bodyFat.compositionShareGraph!.caption).toBe("Share of total mass");
    expect(bodyFat.compositionShareGraph!.normalizedPosition).toBeCloseTo(0.18, 5);
    expect(bodyFat.showUnclassifiedScaffold).toBe(false);
    expect(bodyFat.referenceBar).toBeNull();
    expect(bodyFat.referenceContextLabel).toBeNull();
    expect(bodyFat.accessibilityLabel).not.toMatch(/Educational reference/i);
    expect(bodyFat.accessibilityLabel).toMatch(/Share of total mass|quantity/i);
  });

  it("shows Lean Mass composition-share graph without ASM/ALMI claims", () => {
    const [, , lean] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: null,
        leanBodyMassKg: 60,
        bmi: null,
        hasAnyMetric: true,
      },
      profile: adultProfile,
      unit: "lb",
    });
    expect(lean.classificationChart).toBeNull();
    expect(lean.educationalReferenceChart).toBeNull();
    expect(lean.compositionShareGraph).not.toBeNull();
    expect(lean.compositionShareGraph!.kind).toBe("composition_share");
    expect(lean.compositionShareGraph!.personalClassification).toBeNull();
    expect(lean.showUnclassifiedScaffold).toBe(false);
    expect(lean.title).toBe("Lean Mass");
    expect(lean.accessibilityLabel).toMatch(/total Lean Mass|Share of total mass/i);
    expect(lean.accessibilityLabel).not.toMatch(/\bALMI\b|\bASM\b|sarcopenia/i);
  });

  it("does not invent Body score or aggregate rails", () => {
    const cards = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: 18,
        leanBodyMassKg: 60,
        bmi: 24,
        hasAnyMetric: true,
      },
      profile: adultProfile,
      unit: "kg",
    });
    const serialized = JSON.stringify(cards);
    expect(serialized).not.toMatch(/Body score|Health Protection|Performance Support|You are here/i);
    expect(cards[0].detailHref).toBe(BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight);
  });
  it("converts Weight and Lean display values together when unit changes; Body Fat stays percent", () => {
    const overview = {
      overviewDay: "2026-09-18",
      weightKg: 80,
      bodyFatPercent: 18,
      leanBodyMassKg: 60,
      bmi: 24.2,
      hasAnyMetric: true,
    };
    const lb = buildBodyMetricSummaryCards({
      overview,
      profile: adultProfile,
      unit: "lb",
    });
    const kg = buildBodyMetricSummaryCards({
      overview,
      profile: adultProfile,
      unit: "kg",
    });
    expect(lb[0].displayUnit).toBe("lb");
    expect(kg[0].displayUnit).toBe("kg");
    expect(lb[0].displayValue).not.toBe(kg[0].displayValue);
    expect(lb[2].displayValue).not.toBe(kg[2].displayValue);
    expect(lb[1].displayUnit).toBe("%");
    expect(kg[1].displayUnit).toBe("%");
    expect(lb[1].displayValue).toBe(kg[1].displayValue);
    // Ranges convert with the same unit policy
    const lbRanges = lb[0].classificationChart!.segments.map((s) => s.formattedRange);
    const kgRanges = kg[0].classificationChart!.segments.map((s) => s.formattedRange);
    expect(lbRanges.every((r) => r && r.includes("lb"))).toBe(true);
    expect(kgRanges.every((r) => r && r.includes("kg"))).toBe(true);
    expect(lb[0].classificationChart!.marker!.formattedValue).toMatch(/lb/);
    expect(kg[0].classificationChart!.marker!.formattedValue).toMatch(/kg/);
    // Display value changes with unit; underlying overview kg is not rewritten by the builder
    expect(Number(lb[0].value)).toBeCloseTo(80 * 2.2046226218, 5);
    expect(Number(kg[0].value)).toBe(80);
    expect(lb[0].formattedValue).not.toBe(kg[0].formattedValue);
  });
});

describe("CDC/WHO height-specific range ticks", () => {
  it("produces contiguous gap-free ranges for common heights", () => {
    for (const heightCm of [160, 170, 180, 190]) {
      for (const unit of ["lb", "kg"] as const) {
        const ticks = buildCdcWhoHeightWeightDisplayTicks(heightCm, unit);
        expect(ticks).not.toBeNull();
        expect(assertCdcWhoHeightWeightRangesContiguous(ticks!)).toBe(true);
        const uw = formatCdcWhoWeightRangeForClass("underweight", ticks);
        const hw = formatCdcWhoWeightRangeForClass("healthy_weight", ticks);
        const ow = formatCdcWhoWeightRangeForClass("overweight", ticks);
        const ob = formatCdcWhoWeightRangeForClass("obesity", ticks);
        expect(uw).toMatch(/^</);
        expect(hw).toMatch(/–/);
        expect(ow).toMatch(/–/);
        expect(ob).toMatch(/^≥/);
      }
    }
  });
});
