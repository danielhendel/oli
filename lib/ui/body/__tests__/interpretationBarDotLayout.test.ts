import { describe, expect, it } from "@jest/globals";
import { clampedDotLeftPx } from "../interpretationBarDotLayout";

describe("clampedDotLeftPx", () => {
  it("keeps dot fully inside the track at 0% and 100%", () => {
    const w = 200;
    const d = 10;
    expect(clampedDotLeftPx(w, 0, d)).toBe(0);
    expect(clampedDotLeftPx(w, 1, d)).toBe(w - d);
  });

  it("centers dot at mid track for marker 0.5", () => {
    expect(clampedDotLeftPx(100, 0.5, 10)).toBe(45);
  });

  it("returns 0 for non-positive width or dot size", () => {
    expect(clampedDotLeftPx(0, 0.5, 10)).toBe(0);
    expect(clampedDotLeftPx(100, 0.5, 0)).toBe(0);
  });
});
