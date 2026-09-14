import { describe, expect, it } from "@jest/globals";

import { buildLabMetricStandardOverlay } from "../buildLabMetricStandardOverlay";
import { evaluateLabMetricStandardStatus } from "../evaluateLabMetricStandard";
import {
  formatLabMetricStandardLabelCopy,
  formatLabMetricStandardLines,
  formatLabMetricStandardStatusCopy,
} from "../formatLabMetricStandardCopy";
import {
  getLabMetricStandard,
  GLUCOSE_STANDARD,
  HDL_C_STANDARD,
  TOTAL_CHOLESTEROL_STANDARD,
} from "../labMetricStandardCatalog";

describe("lab metric standard", () => {
  it("resolves Total Cholesterol upper-bound standard", () => {
    const standard = getLabMetricStandard("total_cholesterol");
    expect(standard).toEqual(TOTAL_CHOLESTEROL_STANDARD);
    expect(evaluateLabMetricStandardStatus(179, TOTAL_CHOLESTEROL_STANDARD)).toBe(
      "within_standard",
    );
    expect(evaluateLabMetricStandardStatus(208, TOTAL_CHOLESTEROL_STANDARD)).toBe(
      "above_standard",
    );
    expect(formatLabMetricStandardStatusCopy("within_standard")).toBe("Within standard");
    expect(formatLabMetricStandardLabelCopy(TOTAL_CHOLESTEROL_STANDARD)).toBe(
      "Standard: Under 200 mg/dL",
    );
    expect(formatLabMetricStandardLines({ value: 179, standard: TOTAL_CHOLESTEROL_STANDARD })).toEqual([
      "Within standard",
      "Standard: Under 200 mg/dL",
    ]);
    expect(formatLabMetricStandardLines({ value: 179, standard: TOTAL_CHOLESTEROL_STANDARD }).join(" ")).not.toMatch(
      /quest|oli optimal|deficient|healthy|elite/i,
    );
  });

  it("evaluates HDL lower-bound and glucose bounded standards", () => {
    expect(evaluateLabMetricStandardStatus(62, HDL_C_STANDARD)).toBe("within_standard");
    expect(evaluateLabMetricStandardStatus(35, HDL_C_STANDARD)).toBe("below_standard");
    expect(evaluateLabMetricStandardStatus(93, GLUCOSE_STANDARD)).toBe("within_standard");
    expect(evaluateLabMetricStandardStatus(105, GLUCOSE_STANDARD)).toBe("above_standard");
    expect(evaluateLabMetricStandardStatus(60, GLUCOSE_STANDARD)).toBe("below_standard");
  });

  it("maps standards to chart overlays without lab branding", () => {
    const overlay = buildLabMetricStandardOverlay(TOTAL_CHOLESTEROL_STANDARD);
    expect(overlay).toMatchObject({
      kind: "upper_bound",
      upper: 200,
      inclusive: false,
      providerName: null,
      scope: "persistent",
    });
    expect(buildLabMetricStandardOverlay(null).kind).toBe("none");
  });
});
