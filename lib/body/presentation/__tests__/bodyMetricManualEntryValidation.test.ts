import {
  isValidManualBodyFatPercent,
  isValidManualLeanMassValue,
  isValidManualWeightValue,
  manualEntryValidationMessage,
  parseManualEntryDecimal,
} from "@/lib/body/presentation/bodyMetricManualEntryValidation";

describe("bodyMetricManualEntryValidation", () => {
  it("parses decimals and rejects empty/non-finite", () => {
    expect(parseManualEntryDecimal("")).toBeNull();
    expect(parseManualEntryDecimal("  ")).toBeNull();
    expect(parseManualEntryDecimal("abc")).toBeNull();
    expect(parseManualEntryDecimal("185.2")).toBe(185.2);
  });

  it("validates weight", () => {
    expect(isValidManualWeightValue(185.2)).toBe(true);
    expect(isValidManualWeightValue(0)).toBe(false);
    expect(isValidManualWeightValue(-1)).toBe(false);
  });

  it("validates body fat percent", () => {
    expect(isValidManualBodyFatPercent(18.5)).toBe(true);
    expect(isValidManualBodyFatPercent(0)).toBe(false);
    expect(isValidManualBodyFatPercent(100.1)).toBe(false);
    expect(isValidManualBodyFatPercent(100)).toBe(true);
  });

  it("validates lean mass", () => {
    expect(isValidManualLeanMassValue(135)).toBe(true);
    expect(isValidManualLeanMassValue(0)).toBe(false);
    expect(isValidManualLeanMassValue(-2)).toBe(false);
  });

  it("returns metric-specific validation copy without classification language", () => {
    expect(manualEntryValidationMessage("weight")).toBe("Enter a valid weight.");
    expect(manualEntryValidationMessage("bodyFat")).toBe(
      "Enter a valid Body Fat percentage.",
    );
    expect(manualEntryValidationMessage("leanMass")).toBe("Enter a valid Lean Mass.");
    expect(manualEntryValidationMessage("bodyFat")).not.toMatch(/unhealthy|optimal/i);
  });
});
