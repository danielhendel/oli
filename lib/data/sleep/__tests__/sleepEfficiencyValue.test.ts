import { describe, expect, it } from "@jest/globals";

import {
  formatSleepEfficiencyPercent,
  resolveSleepEfficiencyFromNightField,
  resolveSleepEfficiencyPercent,
} from "@/lib/data/sleep/sleepEfficiencyValue";

describe("resolveSleepEfficiencyPercent", () => {
  it("normalizes 0–1 ratio to percentage (0.93 → 93)", () => {
    const r = resolveSleepEfficiencyPercent(0.93);
    expect(r).not.toBeNull();
    expect(r!.normalizedPercent).toBeCloseTo(93, 10);
    expect(r!.displayPercent).toBe(93);
    expect(r!.formatted).toBe("93%");
  });

  it("treats 1 as 100% per dual-scale contract", () => {
    const r = resolveSleepEfficiencyPercent(1);
    expect(r!.normalizedPercent).toBe(100);
    expect(r!.displayPercent).toBe(100);
    expect(r!.formatted).toBe("100%");
  });

  it("preserves 0–100 percentage values", () => {
    expect(resolveSleepEfficiencyPercent(93)!.normalizedPercent).toBe(93);
    expect(resolveSleepEfficiencyPercent(85)!.normalizedPercent).toBe(85);
    expect(resolveSleepEfficiencyPercent(0)!.normalizedPercent).toBe(0);
  });

  it("preserves unrounded values internally (84.99)", () => {
    const r = resolveSleepEfficiencyPercent(84.99);
    expect(r!.normalizedPercent).toBe(84.99);
    expect(r!.displayPercent).toBe(85);
  });

  it("fails closed for missing, invalid, negative, and >100", () => {
    expect(resolveSleepEfficiencyPercent(null)).toBeNull();
    expect(resolveSleepEfficiencyPercent(undefined)).toBeNull();
    expect(resolveSleepEfficiencyPercent(-1)).toBeNull();
    expect(resolveSleepEfficiencyPercent(100.01)).toBeNull();
    expect(resolveSleepEfficiencyPercent(101)).toBeNull();
    expect(resolveSleepEfficiencyPercent(Number.NaN)).toBeNull();
    expect(resolveSleepEfficiencyPercent(Number.POSITIVE_INFINITY)).toBeNull();
    expect(resolveSleepEfficiencyPercent("93")).toBeNull();
    expect(resolveSleepEfficiencyPercent({})).toBeNull();
  });

  it("does not treat missing as 0%", () => {
    expect(resolveSleepEfficiencyPercent(undefined)).toBeNull();
    expect(formatSleepEfficiencyPercent(null)).toBe("—");
  });

  it("does not accept duration or time-in-bed fields", () => {
    // API accepts only the efficiency scalar — no timeInBed / duration args.
    expect(resolveSleepEfficiencyFromNightField(0.91)?.displayPercent).toBe(91);
    expect(resolveSleepEfficiencyFromNightField(undefined)).toBeNull();
  });
});
