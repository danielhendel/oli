import { describe, expect, it } from "@jest/globals";
import { parseLabReferenceRange } from "../parseLabReferenceRange";

describe("parseLabReferenceRange", () => {
  it("returns null for missing input", () => {
    expect(parseLabReferenceRange(null)).toBeNull();
    expect(parseLabReferenceRange(undefined)).toBeNull();
    expect(parseLabReferenceRange("")).toBeNull();
    expect(parseLabReferenceRange("   ")).toBeNull();
  });

  it("parses a closed numeric range", () => {
    const outcome = parseLabReferenceRange("65-99");
    expect(outcome).not.toBeNull();
    expect(outcome?.structured).toEqual({
      kind: "numeric_range",
      lower: { value: 65, inclusive: true },
      upper: { value: 99, inclusive: true },
    });
  });

  it("parses a closed numeric range with a trailing unit", () => {
    const outcome = parseLabReferenceRange("0.60-1.35 mg/dL");
    expect(outcome?.structured).toEqual({
      kind: "numeric_range",
      lower: { value: 0.6, inclusive: true },
      upper: { value: 1.35, inclusive: true },
      unit: "mg/dL",
    });
  });

  it("parses upper-bound-only ranges with < / <=", () => {
    const lt = parseLabReferenceRange("<100");
    expect(lt?.structured).toEqual({ kind: "numeric_range", upper: { value: 100, inclusive: false } });

    const lte = parseLabReferenceRange("<=100");
    expect(lte?.structured).toEqual({ kind: "numeric_range", upper: { value: 100, inclusive: true } });
  });

  it("parses lower-bound-only ranges with > / >=", () => {
    const gt = parseLabReferenceRange(">40");
    expect(gt?.structured).toEqual({ kind: "numeric_range", lower: { value: 40, inclusive: false } });

    const gte = parseLabReferenceRange(">=40");
    expect(gte?.structured).toEqual({ kind: "numeric_range", lower: { value: 40, inclusive: true } });
  });

  it("parses qualitative expected ranges", () => {
    const outcome = parseLabReferenceRange("Negative");
    expect(outcome?.structured).toEqual({ kind: "qualitative_expected", expectedValues: ["Negative"] });
  });

  it("parses risk-category tables into report_risk_categories rather than an Oli range", () => {
    const outcome = parseLabReferenceRange("Optimal: <100; Near Optimal: 100-129; High Risk: >=190");
    expect(outcome?.structured.kind).toBe("report_risk_categories");
    if (outcome?.structured.kind === "report_risk_categories") {
      expect(outcome.structured.categories.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("falls back to raw_only for ambiguous ranges rather than inventing bounds", () => {
    const outcome = parseLabReferenceRange("See lab notes");
    expect(outcome?.structured).toEqual({ kind: "raw_only", raw: "See lab notes" });
  });

  it("falls back to raw_only when a closed range is inverted", () => {
    const outcome = parseLabReferenceRange("99-65");
    expect(outcome?.structured.kind).toBe("raw_only");
  });
});
