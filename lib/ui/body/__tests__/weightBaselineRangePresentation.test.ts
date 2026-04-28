import { describe, expect, it } from "@jest/globals";
import { formatNinetyDayRangeDeltaLabel } from "../weightBaselineRangePresentation";

describe("formatNinetyDayRangeDeltaLabel", () => {
  it("formats lb span using same one-decimal convention as body weight", () => {
    const lowKg = 80;
    const highKg = 80 + 2.6 / 2.2046226218;
    expect(formatNinetyDayRangeDeltaLabel(lowKg, highKg, "lb")).toBe("2.6 lb");
  });

  it("formats kg span from kg difference", () => {
    expect(formatNinetyDayRangeDeltaLabel(70, 72.6, "kg")).toBe("2.6 kg");
  });

  it("returns zero span when low equals high", () => {
    expect(formatNinetyDayRangeDeltaLabel(80, 80, "lb")).toBe("0.0 lb");
  });
});
