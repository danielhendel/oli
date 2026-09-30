/**
 * Consumer display formatting — synthetic values only.
 */

import { describe, expect, it } from "@jest/globals";

import {
  bodyScanDisplayValuesEquivalent,
  formatBodyScanConsumerDisplayValue,
} from "../bodyScanDisplayFormat";
import {
  formatReviewFieldValue,
  buildReviewSubmission,
  initialReviewInputState,
} from "../reviewFieldInput";
import type { BodyScanReviewFieldDto } from "@oli/contracts";

function field(overrides: Partial<BodyScanReviewFieldDto> & Pick<BodyScanReviewFieldDto, "fieldId">): BodyScanReviewFieldDto {
  return {
    metricId: "total_mass",
    region: "total",
    label: "Total Mass",
    rawValue: "18.8 lb",
    normalizedValue: 8.527514566,
    unit: "kg",
    confidence: 0.95,
    requiresReview: false,
    ...overrides,
  };
}

describe("formatBodyScanConsumerDisplayValue", () => {
  it("uses consumer precision without inventing float noise", () => {
    expect(formatBodyScanConsumerDisplayValue(8.527514566, "kg")).toBe("8.5");
    expect(formatBodyScanConsumerDisplayValue(317.5147, "g")).toBe("318");
    expect(formatBodyScanConsumerDisplayValue(24.8, "percent")).toBe("24.8");
    expect(formatBodyScanConsumerDisplayValue(1.15, "ratio")).toBe("1.15");
    expect(formatBodyScanConsumerDisplayValue(1.186, "g_per_cm2")).toBe("1.186");
    expect(formatBodyScanConsumerDisplayValue(912.4, "cm3")).toBe("912");
  });

  it("treats display-rounded edits as equivalent to canonical", () => {
    expect(bodyScanDisplayValuesEquivalent(8.5, 8.527514566, "kg")).toBe(true);
    expect(bodyScanDisplayValuesEquivalent(8.6, 8.527514566, "kg")).toBe(false);
  });
});

describe("review display precision", () => {
  it("seeds editable text with consumer display precision", () => {
    const state = initialReviewInputState([field({ fieldId: "total:total_mass" })]);
    expect(state["total:total_mass"]?.text).toBe("8.5");
  });

  it("does not treat display-only rounding as a correction", () => {
    const fields = [field({ fieldId: "total:total_mass" })];
    const state = initialReviewInputState(fields);
    const built = buildReviewSubmission(fields, state);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.corrections).toEqual([]);
  });

  it("preserves ratio source precision in the editable field", () => {
    expect(
      formatReviewFieldValue(
        field({
          fieldId: "total:android_gynoid_ratio",
          metricId: "android_gynoid_ratio",
          unit: "ratio",
          normalizedValue: 1.15,
          rawValue: "1.15",
        }),
      ),
    ).toBe("1.15");
  });
});
