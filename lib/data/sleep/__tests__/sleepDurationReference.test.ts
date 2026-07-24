import { describe, expect, it } from "@jest/globals";

import {
  classifySleepDurationReference,
  formatSleepDurationReferenceStatusSentence,
  SLEEP_DURATION_REFERENCE_EVIDENCE_IDS,
  SLEEP_DURATION_REFERENCE_MODEL_VERSION,
  sleepDurationReferenceAccessibilitySummary,
  sleepDurationReferenceAgeBand,
  sleepDurationReferenceMarkerPosition01,
  SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MAX_MINUTES,
  SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MIN_MINUTES,
} from "@/lib/data/sleep/sleepDurationReference";

describe("sleepDurationReferenceAgeBand", () => {
  it("withholds under 18 and unknown", () => {
    expect(sleepDurationReferenceAgeBand(null)).toBeNull();
    expect(sleepDurationReferenceAgeBand(undefined)).toBeNull();
    expect(sleepDurationReferenceAgeBand(17)).toBeNull();
    expect(sleepDurationReferenceAgeBand(Number.NaN)).toBeNull();
  });

  it("maps adults and older adults", () => {
    expect(sleepDurationReferenceAgeBand(18)).toBe("adult_18_64");
    expect(sleepDurationReferenceAgeBand(64)).toBe("adult_18_64");
    expect(sleepDurationReferenceAgeBand(65)).toBe("older_adult_65_plus");
    expect(sleepDurationReferenceAgeBand(90)).toBe("older_adult_65_plus");
  });
});

describe("classifySleepDurationReference — age 18–64 (7–9h)", () => {
  it.each([
    [18, 419, "below_recommended"],
    [18, 420, "within_recommended"],
    [18, 540, "within_recommended"],
    [18, 541, "above_typical"],
    [64, 419, "below_recommended"],
    [64, 420, "within_recommended"],
    [64, 540, "within_recommended"],
    [64, 541, "above_typical"],
  ] as const)("age %i minutes %i → %s", (age, minutes, status) => {
    const result = classifySleepDurationReference({ durationMinutes: minutes, ageYears: age });
    expect(result?.status).toBe(status);
    expect(result?.modelVersion).toBe(SLEEP_DURATION_REFERENCE_MODEL_VERSION);
    expect(result?.evidenceIds).toEqual([...SLEEP_DURATION_REFERENCE_EVIDENCE_IDS]);
    expect(result?.label).not.toMatch(/Optimal|Good|Fair|Low/);
  });
});

describe("classifySleepDurationReference — age 65+ (7–8h)", () => {
  it.each([
    [65, 419, "below_recommended"],
    [65, 420, "within_recommended"],
    [65, 480, "within_recommended"],
    [65, 481, "above_typical"],
    [90, 419, "below_recommended"],
    [90, 480, "within_recommended"],
    [90, 481, "above_typical"],
  ] as const)("age %i minutes %i → %s", (age, minutes, status) => {
    const result = classifySleepDurationReference({ durationMinutes: minutes, ageYears: age });
    expect(result?.status).toBe(status);
    expect(result?.upperRecommendedMinutes).toBe(480);
  });
});

describe("classifySleepDurationReference — withhold", () => {
  it("returns null for unknown age, minor, and invalid duration", () => {
    expect(classifySleepDurationReference({ durationMinutes: 480, ageYears: null })).toBeNull();
    expect(classifySleepDurationReference({ durationMinutes: 480, ageYears: 17 })).toBeNull();
    expect(classifySleepDurationReference({ durationMinutes: null, ageYears: 30 })).toBeNull();
    expect(classifySleepDurationReference({ durationMinutes: 0, ageYears: 30 })).toBeNull();
    expect(classifySleepDurationReference({ durationMinutes: -10, ageYears: 30 })).toBeNull();
    expect(classifySleepDurationReference({ durationMinutes: Number.NaN, ageYears: 30 })).toBeNull();
    expect(
      classifySleepDurationReference({ durationMinutes: Number.POSITIVE_INFINITY, ageYears: 30 }),
    ).toBeNull();
  });

  it("classifies before display rounding (raw minutes)", () => {
    // 419.7 would round to 420 for display elsewhere; classifier receives integers.
    const below = classifySleepDurationReference({ durationMinutes: 419, ageYears: 30 });
    const within = classifySleepDurationReference({ durationMinutes: 420, ageYears: 30 });
    expect(below?.status).toBe("below_recommended");
    expect(within?.status).toBe("within_recommended");
    expect(below?.deltaMinutes).toBe(1);
  });
});

describe("formatSleepDurationReferenceStatusSentence", () => {
  it("formats neutral below / within / above copy", () => {
    const below = classifySleepDurationReference({ durationMinutes: 391, ageYears: 30 });
    expect(formatSleepDurationReferenceStatusSentence(below)).toBe(
      "29 min below the recommended range.",
    );
    const within = classifySleepDurationReference({ durationMinutes: 480, ageYears: 30 });
    expect(formatSleepDurationReferenceStatusSentence(within)).toBe(
      "Within the recommended range.",
    );
    const above = classifySleepDurationReference({ durationMinutes: 570, ageYears: 30 });
    expect(formatSleepDurationReferenceStatusSentence(above)).toMatch(
      /above the typical recommended range/,
    );
    expect(formatSleepDurationReferenceStatusSentence(null)).toBeNull();
  });
});

describe("sleepDurationReferenceMarkerPosition01", () => {
  it("clamps to visual domain edges", () => {
    expect(sleepDurationReferenceMarkerPosition01(0)).toBe(0);
    expect(
      sleepDurationReferenceMarkerPosition01(SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MIN_MINUTES),
    ).toBe(0);
    expect(
      sleepDurationReferenceMarkerPosition01(SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MAX_MINUTES),
    ).toBe(1);
    expect(sleepDurationReferenceMarkerPosition01(12 * 60)).toBe(1);
    const mid = sleepDurationReferenceMarkerPosition01(8 * 60);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe("sleepDurationReferenceAccessibilitySummary", () => {
  it("includes range and status without diagnostic language", () => {
    const result = classifySleepDurationReference({ durationMinutes: 391, ageYears: 30 });
    const summary = sleepDurationReferenceAccessibilitySummary({
      formattedDuration: "6h 31m",
      result,
    });
    expect(summary).toContain("6h 31m");
    expect(summary).toContain("7 to 9 hours");
    expect(summary).not.toMatch(/Optimal|deficient|insomnia|unhealthy/i);
  });
});
