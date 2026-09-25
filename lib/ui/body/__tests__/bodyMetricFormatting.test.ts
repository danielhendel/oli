/**
 * Locks in the shared kg ↔ lb conversion and display rules for Body Composition
 * (`formatBodyWeight`) and Dash body card (same formatter).
 */
import {
  formatBodyWeight,
  formatBodyWeightChange,
} from "@/lib/ui/body/bodyMetricFormatting";

describe("formatBodyWeight", () => {
  it("shows one decimal for fractional pounds (160.7 lb bug case)", () => {
    expect(formatBodyWeight(72.902, "lb")).toBe("160.7 lb");
  });

  it("shows one decimal for typical fractional values", () => {
    expect(formatBodyWeight(72.26, "lb")).toBe("159.3 lb");
    expect(formatBodyWeight(80, "lb")).toBe("176.4 lb");
  });

  it("drops trailing .0 for whole-pound values (161.0 → 161 lb)", () => {
    const kgFor161Lb = 161 / 2.2046226218;
    expect(formatBodyWeight(kgFor161Lb, "lb")).toBe("161 lb");
  });

  it("drops trailing .0 for whole-kilogram values", () => {
    expect(formatBodyWeight(80, "kg")).toBe("80 kg");
    expect(formatBodyWeight(72.6, "kg")).toBe("72.6 kg");
  });
});

describe("formatBodyWeightChange", () => {
  it("prefixes gain with + and loss with Unicode minus", () => {
    expect(formatBodyWeightChange(1.3 / 2.2046226218, "lb")).toBe("+1.3 lb");
    expect(formatBodyWeightChange(-2.4 / 2.2046226218, "lb")).toBe("−2.4 lb");
  });

  it("does not invent judgment language for zero", () => {
    expect(formatBodyWeightChange(0, "lb")).toBe("0 lb");
  });
});
