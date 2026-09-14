/**
 * Map a metric standard into chart overlay geometry.
 * Reuses the chart overlay contract without Quest attribution.
 */

import type { LabChartReferenceOverlay } from "../history/labReferenceOverlayTypes";
import type { LabMetricStandardDefinition } from "./labMetricStandardTypes";

/**
 * Build a chart overlay from a metric standard.
 * providerName stays null so captions do not brand a laboratory.
 */
export function buildLabMetricStandardOverlay(
  standard: LabMetricStandardDefinition | null | undefined,
): LabChartReferenceOverlay {
  if (!standard) {
    return { kind: "none", reason: "missing_reference" };
  }

  if (standard.kind === "upper_bound" && standard.upper) {
    return {
      kind: "upper_bound",
      upper: standard.upper.value,
      inclusive: standard.upper.inclusive,
      providerName: null,
      rawReference: standard.standardLabel,
      scope: "persistent",
    };
  }

  if (standard.kind === "lower_bound" && standard.lower) {
    return {
      kind: "lower_bound",
      lower: standard.lower.value,
      inclusive: standard.lower.inclusive,
      providerName: null,
      rawReference: standard.standardLabel,
      scope: "persistent",
    };
  }

  if (standard.kind === "bounded" && standard.lower && standard.upper) {
    return {
      kind: "bounded",
      lower: standard.lower.value,
      upper: standard.upper.value,
      lowerInclusive: standard.lower.inclusive,
      upperInclusive: standard.upper.inclusive,
      providerName: null,
      rawReference: standard.standardLabel,
      scope: "persistent",
    };
  }

  return { kind: "none", reason: "unsupported_reference_format" };
}
