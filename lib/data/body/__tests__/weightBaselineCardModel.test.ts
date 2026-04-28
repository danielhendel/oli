import { describe, expect, it } from "@jest/globals";
import {
  WEIGHT_BASELINE_THREE_LB_DELTA_KG,
  buildWeightBaselineCardModel,
  classifyWeightChangeFromReferenceKg,
  weightBaselineMarkerFill01,
} from "../weightBaselineCardModel";

const LBS_PER_KG = 2.2046226218;

describe("classifyWeightChangeFromReferenceKg", () => {
  it("treats delta within ±3 lb as Maintaining (inclusive at ±3 lb)", () => {
    expect(classifyWeightChangeFromReferenceKg(0)).toBe("maintaining");
    expect(classifyWeightChangeFromReferenceKg(WEIGHT_BASELINE_THREE_LB_DELTA_KG)).toBe("maintaining");
    expect(classifyWeightChangeFromReferenceKg(-WEIGHT_BASELINE_THREE_LB_DELTA_KG)).toBe("maintaining");
    expect(classifyWeightChangeFromReferenceKg(0.5 * WEIGHT_BASELINE_THREE_LB_DELTA_KG)).toBe("maintaining");
    expect(classifyWeightChangeFromReferenceKg(-0.5 * WEIGHT_BASELINE_THREE_LB_DELTA_KG)).toBe("maintaining");
  });

  it("classifies Gaining when strictly above +3 lb", () => {
    expect(classifyWeightChangeFromReferenceKg(WEIGHT_BASELINE_THREE_LB_DELTA_KG + 1e-6)).toBe("gaining");
    expect(classifyWeightChangeFromReferenceKg(4 / LBS_PER_KG)).toBe("gaining");
  });

  it("classifies Losing when strictly below -3 lb", () => {
    expect(classifyWeightChangeFromReferenceKg(-WEIGHT_BASELINE_THREE_LB_DELTA_KG - 1e-6)).toBe("losing");
    expect(classifyWeightChangeFromReferenceKg(-4 / LBS_PER_KG)).toBe("losing");
  });
});

describe("weightBaselineMarkerFill01", () => {
  it("maps current at low to 0 and at high to 1", () => {
    expect(weightBaselineMarkerFill01(70, 90, 70)).toBe(0);
    expect(weightBaselineMarkerFill01(70, 90, 90)).toBe(1);
  });

  it("maps midpoint to 0.5", () => {
    expect(weightBaselineMarkerFill01(70, 90, 80)).toBe(0.5);
  });

  it("clamps below low and above high", () => {
    expect(weightBaselineMarkerFill01(70, 90, 60)).toBe(0);
    expect(weightBaselineMarkerFill01(70, 90, 100)).toBe(1);
  });

  it("returns 0.5 when low equals high (stable center)", () => {
    expect(weightBaselineMarkerFill01(80, 80, 80)).toBe(0.5);
    expect(weightBaselineMarkerFill01(80, 80, 70)).toBe(0.5);
  });
});

describe("buildWeightBaselineCardModel", () => {
  it("returns insufficient when current weight is null", () => {
    expect(
      buildWeightBaselineCardModel({
        currentWeightKg: null,
        windowSamples: [{ weightKg: 80, observedAt: "2026-01-01T10:00:00.000Z" }],
      }),
    ).toEqual({ kind: "insufficient_data", reason: "no_current_weight" });
  });

  it("returns insufficient when window has no samples", () => {
    expect(
      buildWeightBaselineCardModel({
        currentWeightKg: 80,
        windowSamples: [],
      }),
    ).toEqual({ kind: "insufficient_data", reason: "no_samples_in_window" });
  });

  it("uses the sole sample as reference when only one point exists in the window", () => {
    const m = buildWeightBaselineCardModel({
      currentWeightKg: 80,
      windowSamples: [{ weightKg: 80, observedAt: "2026-01-10T10:00:00.000Z" }],
    });
    expect(m.kind).toBe("ready");
    if (m.kind !== "ready") return;
    expect(m.referenceWeightKg).toBe(80);
    expect(m.ninetyDayLowKg).toBe(80);
    expect(m.ninetyDayHighKg).toBe(80);
    expect(m.classification).toBe("maintaining");
    expect(m.markerFill01).toBe(0.5);
  });

  it("uses mean of all samples as reference when two or more samples exist", () => {
    const m = buildWeightBaselineCardModel({
      currentWeightKg: 80.5,
      windowSamples: [
        { weightKg: 78, observedAt: "2026-01-01T10:00:00.000Z" },
        { weightKg: 82, observedAt: "2026-02-01T10:00:00.000Z" },
      ],
    });
    expect(m.kind).toBe("ready");
    if (m.kind !== "ready") return;
    expect(m.referenceWeightKg).toBe(80);
    expect(m.ninetyDayLowKg).toBe(78);
    expect(m.ninetyDayHighKg).toBe(82);
    expect(m.changeFromReferenceKg).toBe(0.5);
    expect(m.classification).toBe("maintaining");
    expect(m.markerFill01).toBe(0.625);
  });

  it("computes min/max across multiple samples per day", () => {
    const m = buildWeightBaselineCardModel({
      currentWeightKg: 81,
      windowSamples: [
        { weightKg: 80, observedAt: "2026-01-01T08:00:00.000Z" },
        { weightKg: 82, observedAt: "2026-01-01T20:00:00.000Z" },
      ],
    });
    expect(m.kind).toBe("ready");
    if (m.kind !== "ready") return;
    expect(m.ninetyDayLowKg).toBe(80);
    expect(m.ninetyDayHighKg).toBe(82);
    expect(m.referenceWeightKg).toBe(81);
    expect(m.classification).toBe("maintaining");
  });
});
