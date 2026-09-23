import {
  buildWeightTrendInspection,
  friendlyWeightTrendSourceLabel,
  formatWeightTrendInspectionTime,
  WEIGHT_TREND_INSPECTION_IDLE,
} from "@/lib/body/presentation/buildWeightTrendInspection";

describe("friendlyWeightTrendSourceLabel", () => {
  it("maps known sources and omits unknowns", () => {
    expect(friendlyWeightTrendSourceLabel("apple_health")).toBe("Apple Health");
    expect(friendlyWeightTrendSourceLabel("manual")).toBe("Manual");
    expect(friendlyWeightTrendSourceLabel("withings")).toBe("Withings");
    expect(friendlyWeightTrendSourceLabel("mystery_device")).toBeNull();
    expect(friendlyWeightTrendSourceLabel(null)).toBeNull();
  });
});

describe("buildWeightTrendInspection", () => {
  it("builds active hero inspection without year in date", () => {
    const inspection = buildWeightTrendInspection({
      point: {
        observedAt: "2026-09-12T19:11:00.000Z",
        dayKey: "2026-09-12",
        weightKg: 75.5,
        sourceId: "apple_health",
      },
      formatValue: (kg) => `${(kg * 2.2046226218).toFixed(1)} lb`,
      sameDayPointCount: 1,
      metricTitle: "Weight",
    });
    expect(inspection.status).toBe("active");
    if (inspection.status !== "active") return;
    expect(inspection.formattedDate).toBe("Sat, Sep 12");
    expect(inspection.formattedTime).toBeNull();
    expect(inspection.sourceLabel).toBe("Apple Health");
    expect(inspection.accessibilityLabel).toMatch(/Apple Health/);
    expect(inspection.accessibilityLabel).not.toMatch(/T19:11/);
  });

  it("includes local time when multiple same-day points exist", () => {
    const inspection = buildWeightTrendInspection({
      point: {
        observedAt: "2026-09-12T19:11:00.000Z",
        dayKey: "2026-09-12",
        weightKg: 75.5,
        sourceId: "manual",
      },
      formatValue: (kg) => `${kg.toFixed(1)} kg`,
      sameDayPointCount: 2,
    });
    expect(inspection.status).toBe("active");
    if (inspection.status !== "active") return;
    expect(inspection.formattedTime).toBe(formatWeightTrendInspectionTime("2026-09-12T19:11:00.000Z"));
    expect(inspection.sourceLabel).toBe("Manual");
  });

  it("exposes idle sentinel", () => {
    expect(WEIGHT_TREND_INSPECTION_IDLE).toEqual({ status: "idle" });
  });
});
