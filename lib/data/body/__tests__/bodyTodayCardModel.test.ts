import {
  buildBodyTodayCardModel,
  type BodyTodayOverviewSlice,
} from "@/lib/data/body/bodyTodayCardModel";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";

const FULL: BodyTodayOverviewSlice = {
  overviewDay: "2026-03-31",
  weightKg: 80,
  bmi: 24.2,
  bodyFatPercent: 18,
  leanBodyMassKg: 60,
  hasAnyMetric: true,
};

describe("buildBodyTodayCardModel", () => {
  it("formats the primary weight and all supporting rows when available", () => {
    const m = buildBodyTodayCardModel({ overview: FULL, unit: "lb" });
    expect(m.hasAnyMetric).toBe(true);
    expect(m.weightValue).toBe("176.4 lb");
    expect(m.weightHref).toBe(BODY_COMPOSITION_METRIC_DETAIL_ROUTES.weight);
    expect(m.asOfDayKey).toBe("2026-03-31");

    const byKey = Object.fromEntries(m.supportingRows.map((r) => [r.key, r]));
    expect(byKey.bmi!.value).toBe("24.2");
    expect(byKey.bmi!.hasValue).toBe(true);
    expect(byKey.bodyFat!.value).toBe("18.0%");
    expect(byKey.lean!.value).toBe("132.3 lb");
    expect(byKey.lean!.href).toBe(BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass);
  });

  it("emits fallback dashes and hasValue=false for missing supporting metrics", () => {
    const m = buildBodyTodayCardModel({
      overview: { ...FULL, bmi: null, bodyFatPercent: null, leanBodyMassKg: null },
      unit: "lb",
    });
    expect(m.weightValue).toBe("176.4 lb");
    for (const row of m.supportingRows) {
      expect(row.value).toBe("\u2014");
      expect(row.hasValue).toBe(false);
      expect(row.accessibilityLabel).toContain("not available");
    }
  });

  it("reports no weight headline and not-available a11y when weight is missing", () => {
    const m = buildBodyTodayCardModel({
      overview: { ...FULL, weightKg: null },
      unit: "lb",
    });
    expect(m.weightValue).toBeNull();
    expect(m.weightAccessibilityLabel).toContain("not available");
  });

  it("respects the kg unit for weight and lean mass", () => {
    const m = buildBodyTodayCardModel({ overview: FULL, unit: "kg" });
    expect(m.weightValue).toBe("80 kg");
    const lean = m.supportingRows.find((r) => r.key === "lean")!;
    expect(lean.value).toBe("60.0 kg");
  });

  it("marks hasAnyMetric=false when the overview slice has nothing", () => {
    const m = buildBodyTodayCardModel({
      overview: {
        overviewDay: null,
        weightKg: null,
        bmi: null,
        bodyFatPercent: null,
        leanBodyMassKg: null,
        hasAnyMetric: false,
      },
      unit: "lb",
    });
    expect(m.hasAnyMetric).toBe(false);
    expect(m.asOfDayKey).toBeNull();
  });
});
