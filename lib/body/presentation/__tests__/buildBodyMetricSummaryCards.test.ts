import {
  BODY_COMPOSITION_SUMMARY_COPY,
  buildBodyMetricSummaryCards,
} from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";

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
      unit: "lb",
    });
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.metric)).toEqual(["weight", "bodyFat", "leanTissue"]);
    expect(cards.map((c) => c.title)).toEqual(["Weight", "Body Fat", "Lean Tissue"]);
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
      unit: "lb",
    });
    for (const card of cards) {
      expect(card.value).toBeNull();
      expect(card.formattedValue).toBeNull();
      expect(card.formattedValue).not.toBe("0");
      expect(card.formattedValue).not.toBe("0.0");
    }
  });

  it("labels weight as weight-for-height screening without personal marker or BMI target language", () => {
    const [weight] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        bmi: 24.2,
        hasAnyMetric: true,
        latestObservedAtIso: "2026-09-18T12:00:00.000Z",
      },
      unit: "lb",
    });
    expect(weight.formattedValue).toMatch(/lb/);
    expect(weight.referenceContextLabel).toBe("Weight-for-height screening");
    expect(weight.referenceLabel).toBe("Reference unavailable");
    expect(weight.referenceBar?.markerPosition).toBeNull();
    expect(JSON.stringify(weight)).not.toMatch(/ideal weight|optimal Body Composition|BMI target|healthy weight target/i);
  });

  it("withholds Body Fat marker when method is unknown and never infers BIA", () => {
    const [, bodyFat] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: 18,
        leanBodyMassKg: null,
        bmi: null,
        hasAnyMetric: true,
      },
      unit: "lb",
    });
    expect(bodyFat.formattedValue).toBe("18.0%");
    expect(bodyFat.referenceBar?.markerPosition).toBeNull();
    expect(bodyFat.referenceLabel).toBe("Reference unavailable");
    expect(bodyFat.statusLabel).toMatch(/method/i);
    expect(JSON.stringify(bodyFat)).not.toMatch(/BIA|universal|Excellence|Optimized/i);
  });

  it("withholds Lean Tissue marker without a compatible standard", () => {
    const [, , lean] = buildBodyMetricSummaryCards({
      overview: {
        overviewDay: "2026-09-18",
        weightKg: 80,
        bodyFatPercent: null,
        leanBodyMassKg: 60,
        bmi: null,
        hasAnyMetric: true,
      },
      unit: "lb",
    });
    expect(lean.formattedValue).toMatch(/lb/);
    expect(lean.referenceBar?.markerPosition).toBeNull();
    expect(lean.referenceLabel).toMatch(/Method-specific reference unavailable/);
    expect(JSON.stringify(lean)).not.toMatch(/Elite|Optimal|Excellent|Weak|sarcopenia/i);
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
      unit: "kg",
    });
    const serialized = JSON.stringify(cards);
    expect(serialized).not.toMatch(/Body score|Health Protection|Performance Support|You are here/i);
    expect(cards.every((c) => c.detailHref.startsWith("/(app)/body/metric/"))).toBe(true);
    expect(cards[0].detailHref).toBe(BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight);
    expect(cards[1].detailHref).toBe(BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat);
    expect(cards[2].detailHref).toBe(BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass);
  });

  it("omits advanced markers CTA until a real destination exists", () => {
    expect(BODY_COMPOSITION_SUMMARY_COPY.moreMarkersHref).toBeNull();
  });
});
