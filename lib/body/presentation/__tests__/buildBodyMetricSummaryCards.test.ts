import {
  BODY_COMPOSITION_SUMMARY_COPY,
  buildBodyMetricSummaryCards,
} from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";

const adultProfile = {
  heightCm: 170,
  ageYears: 30,
  sex: "female" as const,
};

describe("buildBodyMetricSummaryCards", () => {
  it("returns exactly three cards in Weight → Body Fat → Lean Tissue order", () => {
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

  it("uses CDC/WHO Weight labels and never generic Below/Reference/Above/High", () => {
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
    expect(weight.statusLabel).toBe("Healthy Weight");
    expect(weight.referenceContextLabel).toMatch(/BMI screening/i);
    expect(weight.referenceBar?.markerPosition).not.toBeNull();
    expect(weight.referenceBar?.segments.map((s) => s.label)).toEqual([
      "Underweight",
      "Healthy Weight",
      "Overweight",
      "Obesity",
    ]);
    const labels = weight.referenceBar!.segments.map((s) => s.label).join(" ");
    expect(labels).not.toMatch(/\bBelow\b|\bReference\b|\bAbove\b|\bHigh\b/);
    expect(JSON.stringify(weight)).not.toMatch(/ideal weight|Optimal|Excellence/i);
  });

  it("withholds Weight marker without height", () => {
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
    expect(weight.referenceBar?.markerPosition).toBeNull();
  });

  it("withholds Body Fat classification when standard unresolved / method unknown", () => {
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
    expect(bodyFat.referenceBar).toBeNull();
    expect(bodyFat.referenceLabel).toMatch(/pending approval/i);
    expect(JSON.stringify(bodyFat)).not.toMatch(/BIA|Essential|Athlete|Fitness|Average|Excellence/i);
  });

  it("withholds Lean Tissue classification for total lean mass", () => {
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
    expect(lean.referenceBar).toBeNull();
    expect(lean.statusLabel).toMatch(/Total lean mass/i);
    expect(JSON.stringify(lean)).not.toMatch(/Elite|Optimal|Excellent|Weak|sarcopenia diagnosis/i);
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
    expect(BODY_COMPOSITION_SUMMARY_COPY.moreMarkersHref).toBeNull();
  });
});
