import {
  classifyOuraStressDaySummary,
  computeWeeklyStressBalancedCoverage,
  parseOuraDailyStressProviderDocument,
} from "../ouraStressWeekly";

describe("ouraStressWeekly", () => {
  it("classifies restored and normal as balanced", () => {
    expect(classifyOuraStressDaySummary("restored")).toBe("balanced");
    expect(classifyOuraStressDaySummary("normal")).toBe("balanced");
    expect(classifyOuraStressDaySummary("stressful")).toBe("stressful");
  });

  it("computes balanced-day coverage", () => {
    const r = computeWeeklyStressBalancedCoverage({
      days: [
        { day: "2026-07-06", daySummary: "restored" },
        { day: "2026-07-07", daySummary: "normal" },
        { day: "2026-07-08", daySummary: "stressful" },
        { day: "2026-07-09", daySummary: "normal" },
        { day: "2026-07-10", daySummary: "restored" },
      ],
    });
    expect(r.eligibleStressDayCount).toBe(5);
    expect(r.balancedDayCount).toBe(4);
    expect(r.progress01).toBeCloseTo(0.8);
    expect(r.displayValue).toBe("4 of 5 balanced");
  });

  it("returns null progress when no eligible days", () => {
    const r = computeWeeklyStressBalancedCoverage({ days: [] });
    expect(r.progress01).toBeNull();
    expect(r.displayValue).toBe("No data");
  });

  it("parses valid provider documents and rejects unknown enums", () => {
    expect(
      parseOuraDailyStressProviderDocument({
        id: "abc",
        day: "2026-07-06",
        day_summary: "normal",
        stress_high: 120,
        recovery_high: 300,
      }),
    ).toMatchObject({ day: "2026-07-06", day_summary: "normal" });

    expect(
      parseOuraDailyStressProviderDocument({
        day: "2026-07-06",
        day_summary: "anxious",
      }),
    ).toBeNull();

    expect(
      parseOuraDailyStressProviderDocument({
        day: "2026-07-06",
        stress_high: -1,
      }),
    ).toBeNull();
  });
});
