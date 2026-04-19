import { dailyFactsHasSleepSignal } from "@/lib/data/sleep/sleepFactsSignal";

describe("dailyFactsHasSleepSignal", () => {
  it("is false when sleep is absent", () => {
    expect(dailyFactsHasSleepSignal(undefined)).toBe(false);
  });

  it("is true when totalMinutes > 0", () => {
    expect(dailyFactsHasSleepSignal({ totalMinutes: 420 })).toBe(true);
  });

  it("is true when only mainSleepMinutes > 0", () => {
    expect(dailyFactsHasSleepSignal({ mainSleepMinutes: 400 })).toBe(true);
  });

  it("is false when minutes are zero", () => {
    expect(dailyFactsHasSleepSignal({ totalMinutes: 0 })).toBe(false);
  });

  it("is true when totalMinutes is 0 but mainSleepMinutes is positive (no ?? bug)", () => {
    expect(dailyFactsHasSleepSignal({ totalMinutes: 0, mainSleepMinutes: 400 })).toBe(true);
  });

  it("is true when mainSleepMinutes is 0 but totalMinutes is positive", () => {
    expect(dailyFactsHasSleepSignal({ mainSleepMinutes: 0, totalMinutes: 420 })).toBe(true);
  });
});
