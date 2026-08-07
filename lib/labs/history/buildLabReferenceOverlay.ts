/**
 * Build a source-lab reference overlay for trend charts.
 * Pure — no React, network, or Firestore.
 *
 * Persistent numeric bands require historically compatible same-reference geometry.
 */

import { parseLabReferenceRange } from "../extraction/parseLabReferenceRange";
import {
  evaluateLabReferenceContextCompatibility,
  shouldShowPersistentLabReferenceBand,
} from "../sourceContext/evaluateLabReferenceContextCompatibility";
import { normalizeLabReferenceRaw } from "../sourceContext/evaluateLabSourceReferenceContext";
import type { LabTrendGraphEligibility, LabTrendPoint } from "./labTrendTypes";
import type { LabChartReferenceOverlay } from "./labReferenceOverlayTypes";

export type BuildLabReferenceOverlayInput = {
  graphEligibility: LabTrendGraphEligibility;
  points: readonly LabTrendPoint[];
};

function none(
  reason: Extract<LabChartReferenceOverlay, { kind: "none" }>["reason"],
): LabChartReferenceOverlay {
  return { kind: "none", reason };
}

function providerNameFrom(points: readonly LabTrendPoint[]): string | null {
  const name = points.find((p) => (p.laboratoryName ?? "").trim().length > 0)?.laboratoryName;
  return name?.trim() || null;
}

/**
 * Threshold values that must remain inside the chart y-domain when an overlay renders.
 */
export function labReferenceOverlayThresholds(
  overlay: LabChartReferenceOverlay,
): readonly number[] {
  switch (overlay.kind) {
    case "bounded":
      return [overlay.lower, overlay.upper];
    case "upper_bound":
      return [overlay.upper];
    case "lower_bound":
      return [overlay.lower];
    case "provider_categories": {
      const vals: number[] = [];
      for (const c of overlay.categories) {
        if (c.min != null && Number.isFinite(c.min)) vals.push(c.min);
        if (c.max != null && Number.isFinite(c.max)) vals.push(c.max);
      }
      return vals;
    }
    case "none":
      return [];
    default:
      return [];
  }
}

/** Short caption for restrained legend (outside the plot). */
export function formatLabReferenceOverlayCaption(
  overlay: LabChartReferenceOverlay,
  opts?: { unit?: string | null },
): string | null {
  if (overlay.kind === "none") return null;

  const who = (() => {
    const name = overlay.providerName;
    if (!name) return "Laboratory";
    return /quest/i.test(name) ? "Quest" : name.replace(/\s+Diagnostics$/i, "").trim() || name;
  })();

  if (overlay.kind === "provider_categories") {
    return `${who} categories`;
  }

  const raw = overlay.rawReference.trim();
  const unit = opts?.unit?.trim();
  const withUnit =
    unit && unit !== "none" && !raw.toLowerCase().includes(unit.toLowerCase())
      ? `${raw} ${unit}`
      : raw;
  return `${who} reference: ${withUnit}`;
}

export function buildLabReferenceOverlay(
  input: BuildLabReferenceOverlayInput,
): LabChartReferenceOverlay {
  const { graphEligibility, points } = input;

  if (graphEligibility === "qualitative_timeline") return none("qualitative");
  if (graphEligibility === "pattern_timeline") return none("pattern");
  if (graphEligibility === "inequality_timeline") return none("inequality_history");
  if (graphEligibility !== "numeric_graph" && graphEligibility !== "single_numeric_point") {
    return none("not_numeric_graph");
  }

  if (points.length === 0) return none("missing_reference");

  const compatibility = evaluateLabReferenceContextCompatibility(
    points.map((p) => ({
      laboratoryName: p.laboratoryName,
      methodId: p.methodId,
      specimenType: p.specimenType,
      rawReferenceRange: p.rawReferenceRange,
    })),
  );

  if (!shouldShowPersistentLabReferenceBand(compatibility)) {
    if (compatibility === "missing_reference") return none("missing_reference");
    return none("incompatible_reference_history");
  }

  const raw0 = points[0]?.rawReferenceRange?.trim() ?? "";
  if (!raw0) return none("missing_reference");

  const normalized = normalizeLabReferenceRaw(raw0);
  const parsed = parseLabReferenceRange(normalized);
  if (!parsed) return none("unsupported_reference_format");

  const providerName = providerNameFrom(points);
  const structured = parsed.structured;

  if (structured.kind === "report_risk_categories") {
    // Category zone fills deferred — text source context remains authoritative.
    return none("provider_categories_deferred");
  }

  if (structured.kind === "qualitative_expected") {
    return none("qualitative");
  }

  if (structured.kind === "raw_only") {
    return none("unsupported_reference_format");
  }

  if (structured.kind !== "numeric_range") {
    return none("unsupported_reference_format");
  }

  const lower = structured.lower;
  const upper = structured.upper;

  if (lower && upper) {
    return {
      kind: "bounded",
      lower: lower.value,
      upper: upper.value,
      lowerInclusive: lower.inclusive,
      upperInclusive: upper.inclusive,
      providerName,
      rawReference: raw0,
    };
  }

  if (upper && !lower) {
    return {
      kind: "upper_bound",
      upper: upper.value,
      inclusive: upper.inclusive,
      providerName,
      rawReference: raw0,
    };
  }

  if (lower && !upper) {
    return {
      kind: "lower_bound",
      lower: lower.value,
      inclusive: lower.inclusive,
      providerName,
      rawReference: raw0,
    };
  }

  return none("unsupported_reference_format");
}
