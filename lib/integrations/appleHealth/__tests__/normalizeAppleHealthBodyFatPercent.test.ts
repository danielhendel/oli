import { normalizeAppleHealthBodyFatPercent } from "@/lib/integrations/appleHealth/healthKit";

describe("normalizeAppleHealthBodyFatPercent", () => {
  it("converts fractional HealthKit samples to percent", () => {
    expect(normalizeAppleHealthBodyFatPercent(0.177)).toBeCloseTo(17.7, 5);
    expect(normalizeAppleHealthBodyFatPercent(0.2)).toBeCloseTo(20, 5);
  });

  it("passes through already-percent values", () => {
    expect(normalizeAppleHealthBodyFatPercent(17.7)).toBeCloseTo(17.7, 5);
    expect(normalizeAppleHealthBodyFatPercent(100)).toBe(100);
  });

  it("rejects implausible out-of-range values", () => {
    expect(normalizeAppleHealthBodyFatPercent(-0.1)).toBeNull();
    expect(normalizeAppleHealthBodyFatPercent(101)).toBeNull();
    expect(normalizeAppleHealthBodyFatPercent(Number.NaN)).toBeNull();
  });
});
