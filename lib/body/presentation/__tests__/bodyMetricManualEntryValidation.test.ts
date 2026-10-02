import {
  isValidManualBodyFatPercent,
  isValidManualLeanMassValue,
  isValidManualMeasuredAtIso,
  isValidManualWaistValue,
  isValidManualWeightValue,
  isValidWaistLengthUnit,
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

  it("validates waist value and length unit without clinical cutoffs", () => {
    expect(isValidManualWaistValue(82.5)).toBe(true);
    expect(isValidManualWaistValue(0)).toBe(false);
    expect(isValidManualWaistValue(-1)).toBe(false);
    expect(isValidWaistLengthUnit("in")).toBe(true);
    expect(isValidWaistLengthUnit("cm")).toBe(true);
    expect(isValidWaistLengthUnit("mm")).toBe(false);
  });

  it("validates measured-at ISO timestamps", () => {
    expect(isValidManualMeasuredAtIso("2026-03-04T15:00:00.000Z")).toBe(true);
    expect(isValidManualMeasuredAtIso("")).toBe(false);
    expect(isValidManualMeasuredAtIso("not-a-date")).toBe(false);
  });

  it("returns metric-specific validation copy without classification language", () => {
    expect(manualEntryValidationMessage("weight")).toBe("Enter a valid weight.");
    expect(manualEntryValidationMessage("bodyFat")).toBe(
      "Enter a valid Body Fat percentage.",
    );
    expect(manualEntryValidationMessage("leanMass")).toBe("Enter a valid Lean Mass.");
    expect(manualEntryValidationMessage("waist")).toBe("Enter a valid waist measurement.");
    expect(manualEntryValidationMessage("waist")).not.toMatch(/unhealthy|optimal|risk/i);
    expect(manualEntryValidationMessage("bodyFat")).not.toMatch(/unhealthy|optimal/i);
  });
});
