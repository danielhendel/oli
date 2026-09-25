import type { BodyScanReviewFieldDto } from "@oli/contracts";
import {
  buildReviewSubmission,
  initialReviewInputState,
  parseReviewFieldValue,
  unacknowledgedReviewFieldIds,
} from "../reviewFieldInput";

function field(overrides: Partial<BodyScanReviewFieldDto> = {}): BodyScanReviewFieldDto {
  return {
    fieldId: "total:fat_percent",
    metricId: "fat_percent",
    region: "total",
    label: "Body Fat",
    rawValue: "24.8",
    normalizedValue: 24.8,
    unit: "percent",
    confidence: 0.95,
    requiresReview: false,
    ...overrides,
  };
}

describe("parseReviewFieldValue", () => {
  it("treats an empty field as missing, not as zero", () => {
    expect(parseReviewFieldValue("")).toEqual({ ok: true, value: null });
    expect(parseReviewFieldValue("   ")).toEqual({ ok: true, value: null });
  });

  it("accepts an explicit zero as a real measured value", () => {
    expect(parseReviewFieldValue("0")).toEqual({ ok: true, value: 0 });
  });

  it("rejects text and negative values", () => {
    expect(parseReviewFieldValue("about 24")).toEqual({ ok: false, reason: "not_a_number" });
    expect(parseReviewFieldValue("-3")).toEqual({ ok: false, reason: "negative" });
  });
});

describe("initialReviewInputState", () => {
  it("starts low-confidence fields unacknowledged so the user must look at them", () => {
    const state = initialReviewInputState([
      field({ fieldId: "a", requiresReview: true }),
      field({ fieldId: "b", requiresReview: false }),
    ]);
    expect(state.a?.acknowledged).toBe(false);
    expect(state.b?.acknowledged).toBe(true);
  });

  it("shows an unreadable value as empty rather than inventing one", () => {
    const state = initialReviewInputState([
      field({ fieldId: "a", normalizedValue: null, requiresReview: true }),
    ]);
    expect(state.a?.text).toBe("");
  });
});

describe("buildReviewSubmission", () => {
  it("blocks confirmation while a flagged field is unacknowledged", () => {
    const fields = [field({ fieldId: "a", requiresReview: true })];
    const state = initialReviewInputState(fields);
    expect(unacknowledgedReviewFieldIds(fields, state)).toEqual(["a"]);
    expect(buildReviewSubmission(fields, state)).toEqual({
      ok: false,
      invalidFieldIds: [],
      unacknowledgedFieldIds: ["a"],
    });
  });

  it("blocks confirmation when a value cannot be read as a number", () => {
    const fields = [field({ fieldId: "a" })];
    const result = buildReviewSubmission(fields, { a: { text: "twenty", acknowledged: true } });
    expect(result).toEqual({ ok: false, invalidFieldIds: ["a"], unacknowledgedFieldIds: [] });
  });

  it("sends only the values the user actually changed", () => {
    const fields = [
      field({ fieldId: "a", normalizedValue: 24.8 }),
      field({ fieldId: "b", normalizedValue: 55.3 }),
    ];
    const result = buildReviewSubmission(fields, {
      a: { text: "24.8", acknowledged: true },
      b: { text: "55.9", acknowledged: true },
    });
    expect(result).toEqual({
      ok: true,
      corrections: [{ fieldId: "b", value: 55.9 }],
      acknowledgedFieldIds: ["a", "b"],
    });
  });

  it("records a cleared field as missing rather than zero", () => {
    const fields = [field({ fieldId: "a", normalizedValue: 24.8, requiresReview: true })];
    const result = buildReviewSubmission(fields, { a: { text: "", acknowledged: true } });
    expect(result).toEqual({
      ok: true,
      corrections: [{ fieldId: "a", value: null }],
      acknowledgedFieldIds: ["a"],
    });
  });
});
