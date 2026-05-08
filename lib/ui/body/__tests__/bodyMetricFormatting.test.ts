/**
 * Locks in the shared kg ↔ lb conversion that powers both the Body Composition page
 * (`formatBodyWeight`) and the Dash body hero (`formatBodyHeroWeightLabel`). Any
 * divergence here would silently let Dash hero math drift from Body page math.
 */
import {
  formatBodyHeroWeightAccessibilityLabel,
  formatBodyHeroWeightLabel,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";

describe("bodyMetricFormatting — hero variants", () => {
  it("formatBodyHeroWeightLabel rounds 72.26 kg to 159 lb under imperial unit", () => {
    expect(formatBodyHeroWeightLabel(72.26, "lb")).toBe("159 lb");
  });

  it("formatBodyHeroWeightLabel reuses the same kg ↔ lb conversion as formatBodyWeight", () => {
    /** Same conversion (`LBS_PER_KG`); only the rounding differs (1-decimal vs whole unit). */
    expect(formatBodyWeight(72.26, "lb")).toBe("159.3 lb");
    expect(formatBodyHeroWeightLabel(72.26, "lb")).toBe("159 lb");
  });

  it("formatBodyHeroWeightLabel keeps kilograms as whole numbers when unit is kg", () => {
    expect(formatBodyHeroWeightLabel(72.26, "kg")).toBe("72 kg");
    expect(formatBodyHeroWeightLabel(72.6, "kg")).toBe("73 kg");
  });

  it("formatBodyHeroWeightAccessibilityLabel uses spoken unit words tied to the same rounding", () => {
    expect(formatBodyHeroWeightAccessibilityLabel(72.26, "lb")).toBe("159 pounds");
    expect(formatBodyHeroWeightAccessibilityLabel(72.26, "kg")).toBe("72 kilograms");
  });
});
