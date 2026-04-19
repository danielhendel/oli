import {
  sleepDeepMinutesBarProgress,
  sleepEfficiencyBarProgress,
  sleepLatencyMinutesBarProgress,
  sleepRemMinutesBarProgress,
  sleepTotalMinutesBarProgress,
} from "@/lib/format/sleepMetricBarProgress";

describe("sleepMetricBarProgress", () => {
  it("maps total sleep minutes into 0–1", () => {
    expect(sleepTotalMinutesBarProgress(300)).toBe(0);
    expect(sleepTotalMinutesBarProgress(540)).toBe(1);
    expect(sleepTotalMinutesBarProgress(null)).toBeNull();
  });

  it("maps efficiency ratio 0–1", () => {
    expect(sleepEfficiencyBarProgress(0)).toBe(0);
    expect(sleepEfficiencyBarProgress(0.85)).toBe(0.85);
    expect(sleepEfficiencyBarProgress(85)).toBe(0.85);
  });

  it("inverts latency (lower is better)", () => {
    expect(sleepLatencyMinutesBarProgress(5)).toBe(1);
    expect(sleepLatencyMinutesBarProgress(45)).toBe(0);
  });

  it("maps REM and deep minute bands", () => {
    expect(sleepRemMinutesBarProgress(45)).toBe(0);
    expect(sleepRemMinutesBarProgress(120)).toBe(1);
    expect(sleepDeepMinutesBarProgress(30)).toBe(0);
    expect(sleepDeepMinutesBarProgress(90)).toBe(1);
  });
});
