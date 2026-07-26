import { describe, expect, it } from "@jest/globals";

import { buildSleepStagePersonalComparison } from "@/lib/data/sleep/sleepStagePersonalComparison";
import { sleepStageBaselineRailPositions } from "@/lib/ui/sleep/SleepStagePersonalBaselineRail";

describe("buildSleepStagePersonalComparison", () => {
  it("describes below average with exact minute difference", () => {
    const c = buildSleepStagePersonalComparison({
      currentMinutes: 50,
      ninetyDayAverageMinutes: 52,
    });
    expect(c.currentFormatted).toBe("50m");
    expect(c.baselineFormatted).toBe("52m");
    expect(c.differenceMinutes).toBe(-2);
    expect(c.differenceSentence).toBe("2m below your recent average");
    expect(c.accessibilitySummary).toContain("90-day average is 52m");
    expect(c.accessibilitySummary).toContain("2m below your recent average");
    expect(c.differenceSentence).not.toMatch(/Near|Below your recent pattern|Above your recent pattern|In range|Optimal/);
  });

  it("describes above average and equal cases", () => {
    expect(
      buildSleepStagePersonalComparison({
        currentMinutes: 60,
        ninetyDayAverageMinutes: 50,
      }).differenceSentence,
    ).toBe("10m above your recent average");
    expect(
      buildSleepStagePersonalComparison({
        currentMinutes: 50,
        ninetyDayAverageMinutes: 50,
      }).differenceSentence,
    ).toBe("Same as your recent average");
  });
});

describe("sleepStageBaselineRailPositions", () => {
  it("pins baseline at center and offsets current", () => {
    const equal = sleepStageBaselineRailPositions({
      currentMinutes: 50,
      baselineMinutes: 50,
    });
    expect(equal.baseline).toBe(0.5);
    expect(equal.current).toBe(0.5);

    const below = sleepStageBaselineRailPositions({
      currentMinutes: 40,
      baselineMinutes: 50,
    });
    expect(below.current).toBeLessThan(0.5);

    const above = sleepStageBaselineRailPositions({
      currentMinutes: 60,
      baselineMinutes: 50,
    });
    expect(above.current).toBeGreaterThan(0.5);
  });
});
