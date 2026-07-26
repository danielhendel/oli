import { describe, expect, it } from "@jest/globals";

import {
  classifySleepStageAdultContext,
  classifySleepStageAdultContextStatus,
  classifySleepStagePatternStatus,
  DEEP_SLEEP_ADULT_CONTEXT_LOWER_PERCENT,
  DEEP_SLEEP_ADULT_CONTEXT_UPPER_PERCENT,
  DEEP_SLEEP_CONTEXT_VISUAL_MAX_PERCENT,
  DEEP_SLEEP_CONTEXT_VISUAL_MIN_PERCENT,
  formatSleepStageAdultContextEquivalentMinutes,
  REM_SLEEP_ADULT_CONTEXT_LOWER_PERCENT,
  REM_SLEEP_ADULT_CONTEXT_UPPER_PERCENT,
  REM_SLEEP_CONTEXT_VISUAL_MAX_PERCENT,
  REM_SLEEP_CONTEXT_VISUAL_MIN_PERCENT,
  SLEEP_STAGE_ADULT_CONTEXT_EVIDENCE_IDS,
  SLEEP_STAGE_ADULT_CONTEXT_MODEL_ID,
  SLEEP_STAGE_ADULT_CONTEXT_MODEL_VERSION,
  sleepStageAdultContextAccessibilitySummary,
  sleepStageAdultContextMarkerPosition01,
  sleepStageAdultContextVisualDomain,
  sleepStageAdultContextZoneFractions,
} from "@/lib/data/sleep/sleepStageAdultContext";

describe("classifySleepStageAdultContextStatus — Deep boundaries", () => {
  const lo = DEEP_SLEEP_ADULT_CONTEXT_LOWER_PERCENT;
  const hi = DEEP_SLEEP_ADULT_CONTEXT_UPPER_PERCENT;

  it("classifies inclusive Deep 16–20% band on unrounded percents", () => {
    expect(classifySleepStageAdultContextStatus(15.99, lo, hi)).toBe("below_typical");
    expect(classifySleepStageAdultContextStatus(16, lo, hi)).toBe("within_typical");
    expect(classifySleepStageAdultContextStatus(20, lo, hi)).toBe("within_typical");
    expect(classifySleepStageAdultContextStatus(20.01, lo, hi)).toBe("above_typical");
  });
});

describe("classifySleepStageAdultContextStatus — REM boundaries", () => {
  const lo = REM_SLEEP_ADULT_CONTEXT_LOWER_PERCENT;
  const hi = REM_SLEEP_ADULT_CONTEXT_UPPER_PERCENT;

  it("classifies inclusive REM 21–30% band on unrounded percents", () => {
    expect(classifySleepStageAdultContextStatus(20.99, lo, hi)).toBe("below_typical");
    expect(classifySleepStageAdultContextStatus(21, lo, hi)).toBe("within_typical");
    expect(classifySleepStageAdultContextStatus(30, lo, hi)).toBe("within_typical");
    expect(classifySleepStageAdultContextStatus(30.01, lo, hi)).toBe("above_typical");
  });
});

describe("classifySleepStageAdultContext", () => {
  const base = {
    metricId: "deep_sleep" as const,
    stageMinutes: 50,
    totalSleepMinutes: 450,
    stagePercentUnrounded: 11.111,
    ageYears: 30,
    isComplete: true,
    resolution: "exact_anchor" as const,
  };

  it("returns Below typical range for Deep 11%", () => {
    const result = classifySleepStageAdultContext(base);
    expect(result).not.toBeNull();
    expect(result!.status).toBe("below_typical");
    expect(result!.label).toBe("Below typical range");
    expect(result!.lowerPercent).toBe(16);
    expect(result!.upperPercent).toBe(20);
    expect(result!.modelId).toBe(SLEEP_STAGE_ADULT_CONTEXT_MODEL_ID);
    expect(result!.modelVersion).toBe(SLEEP_STAGE_ADULT_CONTEXT_MODEL_VERSION);
    expect(result!.evidenceIds).toEqual([...SLEEP_STAGE_ADULT_CONTEXT_EVIDENCE_IDS]);
    expect(result!.label).not.toMatch(
      /\bOptimal\b|\bGood\b|\bFair\b|\bLow\b|\bhealthy\b|\bclinical\b|Recommended/i,
    );
  });

  it("returns In typical range for REM 30%", () => {
    const result = classifySleepStageAdultContext({
      metricId: "rem_sleep",
      stageMinutes: 135,
      totalSleepMinutes: 450,
      stagePercentUnrounded: 30,
      ageYears: 40,
      isComplete: true,
      resolution: "exact_anchor",
    });
    expect(result!.status).toBe("within_typical");
    expect(result!.label).toBe("In typical range");
    expect(result!.lowerPercent).toBe(21);
    expect(result!.upperPercent).toBe(30);
  });

  it("returns Above typical range above the band", () => {
    const result = classifySleepStageAdultContext({
      ...base,
      stagePercentUnrounded: 24,
    });
    expect(result!.status).toBe("above_typical");
    expect(result!.label).toBe("Above typical range");
  });

  it("withholds for unsupported ages and missing inputs", () => {
    expect(classifySleepStageAdultContext({ ...base, ageYears: null })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, ageYears: 17 })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, ageYears: 65 })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, stageMinutes: null })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, totalSleepMinutes: null })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, totalSleepMinutes: 0 })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, totalSleepMinutes: -10 })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, stagePercentUnrounded: null })).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, stagePercentUnrounded: Number.NaN })).toBeNull();
    expect(
      classifySleepStageAdultContext({
        ...base,
        stagePercentUnrounded: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull();
    expect(classifySleepStageAdultContext({ ...base, isComplete: false })).toBeNull();
    expect(
      classifySleepStageAdultContext({
        ...base,
        resolution: "latest_completed_prior_night",
      }),
    ).toBeNull();
  });

  it("does not let rounded equivalent minutes change classification", () => {
    // 20.4% is above typical; rounding minutes must not pull it into within.
    const result = classifySleepStageAdultContext({
      ...base,
      stageMinutes: 92,
      totalSleepMinutes: 450,
      stagePercentUnrounded: 20.444,
    });
    expect(result!.status).toBe("above_typical");
  });
});

describe("formatSleepStageAdultContextEquivalentMinutes", () => {
  it("derives Deep 16–20% equivalent minutes from total sleep", () => {
    // 450 * 0.16 = 72; 450 * 0.20 = 90
    const eq = formatSleepStageAdultContextEquivalentMinutes({
      totalSleepMinutes: 450,
      lowerPercent: 16,
      upperPercent: 20,
    });
    expect(eq.equivalentLowerMinutes).toBe(72);
    expect(eq.equivalentUpperMinutes).toBe(90);
    expect(eq.formattedLower).toBe("1h 12m");
    expect(eq.formattedUpper).toBe("1h 30m");
    expect(eq.equivalentSentence).toBe("About 1h 12m–1h 30m for this sleep duration");
  });

  it("derives REM 21–30% equivalent minutes from total sleep", () => {
    // 450 * 0.21 = 94.5 → round display 95m; 450 * 0.30 = 135 → 2h 15m
    const eq = formatSleepStageAdultContextEquivalentMinutes({
      totalSleepMinutes: 450,
      lowerPercent: 21,
      upperPercent: 30,
    });
    expect(eq.equivalentLowerMinutes).toBeCloseTo(94.5, 5);
    expect(eq.equivalentUpperMinutes).toBe(135);
    expect(eq.formattedLower).toBe("1h 35m");
    expect(eq.formattedUpper).toBe("2h 15m");
  });
});

describe("sleepStageAdultContext visualization geometry", () => {
  it("exposes named visual domains without changing scientific thresholds", () => {
    expect(sleepStageAdultContextVisualDomain("deep_sleep")).toEqual({
      minPercent: DEEP_SLEEP_CONTEXT_VISUAL_MIN_PERCENT,
      maxPercent: DEEP_SLEEP_CONTEXT_VISUAL_MAX_PERCENT,
    });
    expect(sleepStageAdultContextVisualDomain("rem_sleep")).toEqual({
      minPercent: REM_SLEEP_CONTEXT_VISUAL_MIN_PERCENT,
      maxPercent: REM_SLEEP_CONTEXT_VISUAL_MAX_PERCENT,
    });
    expect(DEEP_SLEEP_ADULT_CONTEXT_LOWER_PERCENT).toBe(16);
    expect(DEEP_SLEEP_ADULT_CONTEXT_UPPER_PERCENT).toBe(20);
    expect(REM_SLEEP_ADULT_CONTEXT_LOWER_PERCENT).toBe(21);
    expect(REM_SLEEP_ADULT_CONTEXT_UPPER_PERCENT).toBe(30);
  });

  it("maps Deep 16–20% onto a visibly meaningful center width", () => {
    const deep = sleepStageAdultContextZoneFractions("deep_sleep");
    expect(deep.below).toBeCloseTo(deep.above, 5);
    expect(deep.typical).toBeGreaterThanOrEqual(0.18);
    expect(deep.below + deep.typical + deep.above).toBeCloseTo(1, 5);
    // Legacy 0→(16+20) scale made typical only ~11% of the bar.
    expect(deep.typical).toBeGreaterThan(4 / 36);
  });

  it("maps REM 21–30% onto a visibly meaningful center width", () => {
    const rem = sleepStageAdultContextZoneFractions("rem_sleep");
    expect(rem.typical).toBeGreaterThanOrEqual(0.22);
    expect(rem.below).toBeGreaterThan(0.15);
    expect(rem.above).toBeGreaterThan(0.15);
    expect(rem.below + rem.typical + rem.above).toBeCloseTo(1, 5);
  });

  it("clamps marker at visual edges without changing real percent", () => {
    expect(
      sleepStageAdultContextMarkerPosition01({
        metricId: "deep_sleep",
        stagePercentUnrounded: -5,
      }),
    ).toBe(0.02);
    expect(
      sleepStageAdultContextMarkerPosition01({
        metricId: "deep_sleep",
        stagePercentUnrounded: 200,
      }),
    ).toBe(0.98);
    // 11% Deep stays below typical and maps inside the below zone.
    const pos = sleepStageAdultContextMarkerPosition01({
      metricId: "deep_sleep",
      stagePercentUnrounded: 11.111,
    });
    const deep = sleepStageAdultContextZoneFractions("deep_sleep");
    expect(pos).toBeLessThan(deep.below);
  });
});

describe("sleepStageAdultContextAccessibilitySummary", () => {
  it("announces status, typical band, today, and optional 90-day percent", () => {
    expect(
      sleepStageAdultContextAccessibilitySummary({
        label: "Below typical range",
        lowerPercent: 16,
        upperPercent: 20,
        currentPercentDisplay: 11,
        ninetyDayPercentDisplay: 13,
      }),
    ).toBe(
      "Below typical range. The typical range is 16 to 20 percent. Today is 11 percent. Your 90-day average is 13 percent.",
    );
    expect(
      sleepStageAdultContextAccessibilitySummary({
        label: "In typical range",
        lowerPercent: 21,
        upperPercent: 30,
        currentPercentDisplay: 30,
        ninetyDayPercentDisplay: null,
      }),
    ).toBe(
      "In typical range. The typical range is 21 to 30 percent. Today is 30 percent.",
    );
  });
});

describe("classifySleepStagePatternStatus", () => {
  it("classifies Deep average percents against 16–20%", () => {
    expect(
      classifySleepStagePatternStatus({
        metricId: "deep_sleep",
        averagePercent: 15.9,
        hasEnoughPercentData: true,
      }),
    ).toBe("Below range");
    expect(
      classifySleepStagePatternStatus({
        metricId: "deep_sleep",
        averagePercent: 16,
        hasEnoughPercentData: true,
      }),
    ).toBe("In range");
    expect(
      classifySleepStagePatternStatus({
        metricId: "deep_sleep",
        averagePercent: 20,
        hasEnoughPercentData: true,
      }),
    ).toBe("In range");
    expect(
      classifySleepStagePatternStatus({
        metricId: "deep_sleep",
        averagePercent: 20.1,
        hasEnoughPercentData: true,
      }),
    ).toBe("Above range");
  });

  it("classifies REM average percents against 21–30%", () => {
    expect(
      classifySleepStagePatternStatus({
        metricId: "rem_sleep",
        averagePercent: 20.9,
        hasEnoughPercentData: true,
      }),
    ).toBe("Below range");
    expect(
      classifySleepStagePatternStatus({
        metricId: "rem_sleep",
        averagePercent: 25,
        hasEnoughPercentData: true,
      }),
    ).toBe("In range");
    expect(
      classifySleepStagePatternStatus({
        metricId: "rem_sleep",
        averagePercent: 30.1,
        hasEnoughPercentData: true,
      }),
    ).toBe("Above range");
  });

  it("omits classification when percent data is insufficient", () => {
    expect(
      classifySleepStagePatternStatus({
        metricId: "deep_sleep",
        averagePercent: 18,
        hasEnoughPercentData: false,
      }),
    ).toBeNull();
    expect(
      classifySleepStagePatternStatus({
        metricId: "deep_sleep",
        averagePercent: null,
        hasEnoughPercentData: true,
      }),
    ).toBeNull();
  });
});
