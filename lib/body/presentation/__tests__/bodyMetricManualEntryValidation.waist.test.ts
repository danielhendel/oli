import {
  isValidManualMeasuredAtIso,
  isValidManualWaistMeasuredAtIso,
  isValidManualWaistValue,
  isValidWaistLengthUnit,
  manualEntryValidationMessage,
} from "@/lib/body/presentation/bodyMetricManualEntryValidation";

describe("waist manual entry validation", () => {
  it("accepts finite positive waist values only", () => {
    expect(isValidManualWaistValue(82.5)).toBe(true);
    expect(isValidManualWaistValue(0)).toBe(false);
    expect(isValidManualWaistValue(-1)).toBe(false);
    expect(isValidManualWaistValue(Number.NaN)).toBe(false);
  });

  it("accepts only in/cm length units", () => {
    expect(isValidWaistLengthUnit("in")).toBe(true);
    expect(isValidWaistLengthUnit("cm")).toBe(true);
    expect(isValidWaistLengthUnit("mm")).toBe(false);
  });

  it("requires a parseable measuredAt ISO that is not in the future", () => {
    const nowMs = Date.parse("2026-10-02T18:00:00.000Z");
    expect(isValidManualMeasuredAtIso("2026-03-04T12:00:00.000Z")).toBe(true);
    expect(isValidManualMeasuredAtIso("")).toBe(false);
    expect(isValidManualMeasuredAtIso("not-a-date")).toBe(false);
    expect(isValidManualWaistMeasuredAtIso("2026-10-03T00:00:00.000Z", nowMs)).toBe(false);
  });

  it("returns waist-specific validation copy", () => {
    expect(manualEntryValidationMessage("waist")).toMatch(/waist/i);
  });
});
