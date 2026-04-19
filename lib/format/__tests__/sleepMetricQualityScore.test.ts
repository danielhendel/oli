import {
  sleepEfficiencyToQualityScore,
  sleepLatencyMinutesToQualityScore,
  totalSleepMinutesToQualityScore,
} from "@/lib/format/sleepMetricQualityScore";

describe("sleepMetricQualityScore", () => {
  it("returns null for missing inputs", () => {
    expect(totalSleepMinutesToQualityScore(null)).toBeNull();
    expect(sleepEfficiencyToQualityScore(undefined)).toBeNull();
  });

  it("maps bands consistently with bar helpers’ endpoints", () => {
    expect(totalSleepMinutesToQualityScore(300)).toBe(0);
    expect(totalSleepMinutesToQualityScore(540)).toBe(100);
    expect(sleepLatencyMinutesToQualityScore(5)).toBe(100);
    expect(sleepLatencyMinutesToQualityScore(45)).toBe(0);
  });
});
