import { describe, expect, it } from "@jest/globals";
import { evaluateLabSourceReferenceContext } from "../evaluateLabSourceReferenceContext";
import { evaluateLabReferenceContextCompatibility, shouldShowPersistentLabReferenceBand } from "../evaluateLabReferenceContextCompatibility";
import {
  formatLabSourceFlagCopy,
  formatLabSourceReferenceRawCopy,
  formatLabSourceReferenceStatusCopy,
} from "../formatLabSourceReferenceCopy";

describe("evaluateLabSourceReferenceContext", () => {
  it("evaluates bounded numeric within/above/below", () => {
    const within = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 93, comparator: "eq" },
      rawReferenceRange: "70-99",
      laboratoryName: "Quest Diagnostics",
    });
    expect(within.status).toBe("within_reference");

    const above = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 105, comparator: "eq" },
      rawReferenceRange: "70-99",
      laboratoryName: "Quest Diagnostics",
    });
    expect(above.status).toBe("above_reference");

    const below = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 60, comparator: "eq" },
      rawReferenceRange: "70-99",
      laboratoryName: "Quest Diagnostics",
    });
    expect(below.status).toBe("below_reference");
  });

  it("evaluates upper-only and lower-only ranges", () => {
    const withinUpper = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 179, comparator: "eq" },
      rawReferenceRange: "<200",
      laboratoryName: "Quest Diagnostics",
    });
    expect(withinUpper.status).toBe("within_reference");

    const aboveUpper = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 208, comparator: "eq" },
      rawReferenceRange: "<200",
      laboratoryName: "Quest Diagnostics",
    });
    expect(aboveUpper.status).toBe("above_reference");

    const withinLower = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 62, comparator: "eq" },
      rawReferenceRange: ">40",
      laboratoryName: "Quest Diagnostics",
    });
    expect(withinLower.status).toBe("within_reference");

    const belowLower = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 35, comparator: "eq" },
      rawReferenceRange: ">40",
      laboratoryName: "Quest Diagnostics",
    });
    expect(belowLower.status).toBe("below_reference");
  });

  it("does not invent exact status for censored inequality results", () => {
    const ctx = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 4, comparator: "lt" },
      rawReferenceRange: "<10",
      laboratoryName: "Quest Diagnostics",
    });
    expect(ctx.status).toBe("not_evaluable");
  });

  it("maps missing reference", () => {
    const ctx = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 179, comparator: "eq" },
      rawReferenceRange: null,
    });
    expect(ctx.status).toBe("reference_unavailable");
  });

  it("uses source high/low flags", () => {
    const high = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 208, comparator: "eq" },
      rawReferenceRange: null,
      normalizedFlag: "high",
      laboratoryName: "Quest Diagnostics",
    });
    expect(high.status).toBe("above_reference");
    expect(high.sourceFlag).toBe("high");
  });

  it("attributes provider risk categories from report tables", () => {
    const ctx = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 145, comparator: "eq" },
      rawReferenceRange: "Optimal: <100; Moderate: 100-160; High: >160",
      laboratoryName: "Quest Diagnostics",
    });
    expect(ctx.status).toBe("provider_category");
    expect(ctx.providerCategory).toBe("moderate");
    expect(ctx.referenceLabel?.toLowerCase()).toContain("moderate");
  });

  it("handles qualitative expected values", () => {
    const expected = evaluateLabSourceReferenceContext({
      result: { kind: "qualitative", value: "negative", rawValue: "Negative" },
      rawReferenceRange: "Negative",
      laboratoryName: "Quest Diagnostics",
    });
    expect(expected.status).toBe("qualitative_expected");

    const unexpected = evaluateLabSourceReferenceContext({
      result: { kind: "qualitative", value: "positive", rawValue: "Positive" },
      rawReferenceRange: "Negative",
      laboratoryName: "Quest Diagnostics",
    });
    expect(unexpected.status).toBe("qualitative_unexpected");
  });

  it("handles pattern expected values", () => {
    const ctx = evaluateLabSourceReferenceContext({
      result: { kind: "pattern", value: "Pattern B" },
      rawReferenceRange: "Pattern A",
      laboratoryName: "Quest Diagnostics",
    });
    expect(ctx.status).toBe("pattern_non_expected");
  });
});

describe("formatLabSourceReferenceCopy", () => {
  it("uses Quest-attributed wording and never Oli healthy language", () => {
    const within = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 179, comparator: "eq" },
      rawReferenceRange: "<200 mg/dL",
      laboratoryName: "Quest Diagnostics",
    });
    const status = formatLabSourceReferenceStatusCopy(within);
    const raw = formatLabSourceReferenceRawCopy(within);
    expect(status).toBe("Within Quest reference range");
    expect(raw).toMatch(/Quest reference:/i);
    expect(status).not.toMatch(/healthy|optimal for you|dangerous|safe|oli/i);
    expect(raw).not.toMatch(/healthy|dangerous|oli/i);
  });

  it("uses generic laboratory wording when provider unknown", () => {
    const within = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 179, comparator: "eq" },
      rawReferenceRange: "<200",
    });
    expect(formatLabSourceReferenceStatusCopy(within)).toBe(
      "Within laboratory reference range",
    );
  });

  it("formats provider category and flags", () => {
    const cat = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 200, comparator: "eq" },
      providerCategoryLabel: "High",
      laboratoryName: "Quest Diagnostics",
    });
    expect(formatLabSourceReferenceStatusCopy(cat)).toBe("Quest category: High");

    const flagged = evaluateLabSourceReferenceContext({
      result: { kind: "numeric", value: 208, comparator: "eq" },
      rawReferenceRange: "<200",
      normalizedFlag: "high",
      laboratoryName: "Quest Diagnostics",
    });
    expect(formatLabSourceFlagCopy(flagged)).toBe("Quest flag: High");
  });
});

describe("evaluateLabReferenceContextCompatibility", () => {
  it("marks same lab/range compatible", () => {
    const c = evaluateLabReferenceContextCompatibility([
      { laboratoryName: "Quest", methodId: "m1", specimenType: "serum", rawReferenceRange: "<200" },
      { laboratoryName: "Quest", methodId: "m1", specimenType: "serum", rawReferenceRange: "<200" },
    ]);
    expect(c).toBe("compatible_same_reference");
    expect(shouldShowPersistentLabReferenceBand(c)).toBe(true);
  });

  it("marks changed range / method / specimen incompatible", () => {
    expect(
      evaluateLabReferenceContextCompatibility([
        { laboratoryName: "Quest", rawReferenceRange: "<200" },
        { laboratoryName: "Quest", rawReferenceRange: "<190" },
      ]),
    ).toBe("different_reference");

    expect(
      evaluateLabReferenceContextCompatibility([
        { laboratoryName: "Quest", methodId: "a", rawReferenceRange: "<200" },
        { laboratoryName: "Quest", methodId: "b", rawReferenceRange: "<200" },
      ]),
    ).toBe("different_method");

    expect(
      evaluateLabReferenceContextCompatibility([
        { laboratoryName: "Quest", specimenType: "serum", rawReferenceRange: "<200" },
        { laboratoryName: "Quest", specimenType: "plasma", rawReferenceRange: "<200" },
      ]),
    ).toBe("different_specimen");
  });

  it("marks missing reference", () => {
    expect(
      evaluateLabReferenceContextCompatibility([
        { laboratoryName: "Quest", rawReferenceRange: "<200" },
        { laboratoryName: "Quest", rawReferenceRange: null },
      ]),
    ).toBe("missing_reference");
    expect(shouldShowPersistentLabReferenceBand("missing_reference")).toBe(false);
  });
});
