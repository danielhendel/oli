import {
  nextChromeHeightState,
  normalizeChromeHeight,
} from "@/lib/ui/navigation/normalizeChromeHeight";

describe("normalizeChromeHeight", () => {
  it("returns undefined for undefined input", () => {
    expect(normalizeChromeHeight(undefined)).toBeUndefined();
  });

  it("returns 0 for NaN and negative values", () => {
    expect(normalizeChromeHeight(Number.NaN)).toBe(0);
    expect(normalizeChromeHeight(-4.2)).toBe(0);
  });

  it("ceil fractional heights", () => {
    expect(normalizeChromeHeight(83.1)).toBe(84);
    expect(normalizeChromeHeight(83)).toBe(83);
  });
});

describe("nextChromeHeightState", () => {
  it("returns current when normalized height is unchanged", () => {
    expect(nextChromeHeightState(84, 84)).toBe(84);
    expect(nextChromeHeightState(undefined, undefined)).toBeUndefined();
  });

  it("returns normalized next when height changes", () => {
    expect(nextChromeHeightState(80, 84.1)).toBe(85);
    expect(nextChromeHeightState(undefined, 72)).toBe(72);
    expect(nextChromeHeightState(72, undefined)).toBeUndefined();
  });
});
