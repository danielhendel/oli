import { describe, expect, it } from "@jest/globals";

import {
  classifySleepEfficiencyGuideline,
  classifySleepEfficiencyGuidelineStatus,
  classifySleepEfficiencyPatternStatus,
  SLEEP_EFFICIENCY_GUIDELINE_EVIDENCE_IDS,
  SLEEP_EFFICIENCY_GUIDELINE_MODEL_VERSION,
  SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT,
  SLEEP_EFFICIENCY_VISUAL_MAX_PERCENT,
  SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT,
  sleepEfficiencyGuidelineMarkerPosition01,
  sleepEfficiencyGuidelineStatusLabel,
  sleepEfficiencyGuidelineZoneFractions,
  sleepEfficiencyPatternStatusLabel,
} from "@/lib/data/sleep/sleepEfficiencyGuideline";

describe("sleepEfficiencyGuideline", () => {
  it("classifies 84.99 as below and 85 as meets without rounding first", () => {
    expect(classifySleepEfficiencyGuidelineStatus(84.99)).toBe("below_guideline");
    expect(classifySleepEfficiencyGuidelineStatus(85)).toBe("meets_guideline");
    expect(classifySleepEfficiencyGuidelineStatus(100)).toBe("meets_guideline");
    expect(sleepEfficiencyGuidelineStatusLabel("below_guideline")).toBe(
      "Below typical guideline",
    );
    expect(sleepEfficiencyGuidelineStatusLabel("meets_guideline")).toBe(
      "Meets typical guideline",
    );
  });

  it("returns versioned result with evidence metadata and no Optimal ladder", () => {
    const result = classifySleepEfficiencyGuideline(93);
    expect(result).toEqual({
      status: "meets_guideline",
      label: "Meets typical guideline",
      thresholdPercent: SLEEP_EFFICIENCY_GUIDELINE_THRESHOLD_PERCENT,
      normalizedPercent: 93,
      modelId: "sleep-efficiency-guideline",
      modelVersion: SLEEP_EFFICIENCY_GUIDELINE_MODEL_VERSION,
      evidenceIds: SLEEP_EFFICIENCY_GUIDELINE_EVIDENCE_IDS,
    });
    expect(result!.label).not.toMatch(/Optimal|Elite|Good|Fair|Healthy|Poor/);
  });

  it("fails closed for invalid input", () => {
    expect(classifySleepEfficiencyGuideline(null)).toBeNull();
    expect(classifySleepEfficiencyGuideline(undefined)).toBeNull();
    expect(classifySleepEfficiencyGuideline(Number.NaN)).toBeNull();
    expect(classifySleepEfficiencyGuideline(-1)).toBeNull();
    expect(classifySleepEfficiencyGuideline(101)).toBeNull();
  });

  it("pattern status uses short labels and withholds when insufficient", () => {
    expect(
      classifySleepEfficiencyPatternStatus({ averagePercent: 84, hasEnoughData: true }),
    ).toBe("Below guideline");
    expect(
      classifySleepEfficiencyPatternStatus({ averagePercent: 90, hasEnoughData: true }),
    ).toBe("Meets guideline");
    expect(
      classifySleepEfficiencyPatternStatus({ averagePercent: 90, hasEnoughData: false }),
    ).toBeNull();
    expect(sleepEfficiencyPatternStatusLabel("meets_guideline")).toBe("Meets guideline");
  });

  it("visual domain is 60–100 with two zones only (no above tier)", () => {
    expect(SLEEP_EFFICIENCY_VISUAL_MIN_PERCENT).toBe(60);
    expect(SLEEP_EFFICIENCY_VISUAL_MAX_PERCENT).toBe(100);
    const zones = sleepEfficiencyGuidelineZoneFractions();
    expect(zones.below + zones.meets).toBeCloseTo(1, 10);
    expect(zones.below).toBeGreaterThan(0.2);
    expect(zones.meets).toBeGreaterThan(0.2);
    expect(Object.keys(zones).sort()).toEqual(["below", "meets"]);
  });

  it("clamps marker visually without changing classification", () => {
    expect(sleepEfficiencyGuidelineMarkerPosition01(50)).toBe(0.02);
    expect(sleepEfficiencyGuidelineMarkerPosition01(110)).toBe(0.98);
    expect(sleepEfficiencyGuidelineMarkerPosition01(85)).toBeCloseTo(0.625, 5);
    expect(classifySleepEfficiencyGuidelineStatus(50)).toBe("below_guideline");
  });
});
