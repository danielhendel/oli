import { describe, expect, it } from "@jest/globals";
import { LABS_UNIT_REGISTRY_VERSION } from "../../../contracts/labsOs";
import { parseLabUnitCandidate, unitsAreTrendCompatible } from "../parseLabUnit";

describe("parseLabUnitCandidate", () => {
  it("returns a known-null candidate for missing units", () => {
    expect(parseLabUnitCandidate(null)).toEqual({
      rawUnit: null,
      normalizedUnit: null,
      unitRegistryVersion: LABS_UNIT_REGISTRY_VERSION,
      confidence: 1,
      known: true,
    });
    expect(parseLabUnitCandidate(undefined).known).toBe(true);
    expect(parseLabUnitCandidate("   ").known).toBe(true);
  });

  it("normalizes a known unit notation exactly", () => {
    const result = parseLabUnitCandidate("mg/dl");
    expect(result.known).toBe(true);
    expect(result.normalizedUnit).toBe("mg/dL");
    expect(result.rawUnit).toBe("mg/dl");
  });

  it("normalizes case-insensitively when no direct match", () => {
    const result = parseLabUnitCandidate("MG/DL");
    expect(result.known).toBe(true);
    expect(result.normalizedUnit).toBe("mg/dL");
  });

  it("normalizes micro-sign variants", () => {
    const result = parseLabUnitCandidate("µIU/mL");
    expect(result.known).toBe(true);
    expect(result.normalizedUnit).toBe("uIU/mL");
  });

  it("marks unrecognized units as unknown without inventing a normalized form", () => {
    const result = parseLabUnitCandidate("furlongs/fortnight");
    expect(result.known).toBe(false);
    expect(result.normalizedUnit).toBeNull();
    expect(result.rawUnit).toBe("furlongs/fortnight");
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("does not convert values across units — no conversion table is exposed", () => {
    const result = parseLabUnitCandidate("nmol/L");
    expect(result.normalizedUnit).toBe("nmol/L");
    // Only notation normalization; no numeric conversion helper exists on this module.
    expect((result as Record<string, unknown>).conversionFactor).toBeUndefined();
  });
});

describe("unitsAreTrendCompatible", () => {
  it("is compatible only for identical known normalized units", () => {
    expect(unitsAreTrendCompatible("mg/dL", "mg/dL")).toBe(true);
    expect(unitsAreTrendCompatible("mg/dL", "mmol/L")).toBe(false);
  });

  it("is not compatible when either side is missing", () => {
    expect(unitsAreTrendCompatible(null, "mg/dL")).toBe(false);
    expect(unitsAreTrendCompatible("mg/dL", undefined)).toBe(false);
    expect(unitsAreTrendCompatible(null, null)).toBe(false);
  });
});
