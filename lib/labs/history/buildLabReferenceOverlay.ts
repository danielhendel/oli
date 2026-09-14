/**
 * Build a source-lab reference overlay for trend charts.
 * Pure — no React, network, or Firestore.
 *
 * Persistent numeric bands require historically compatible same-reference geometry.
 * When history is incomplete/incompatible but the latest point has a clear source
 * reference, emit a latest-scoped band with explicit "Latest … reference" attribution.
 */

import { parseLabReferenceRange } from "../extraction/parseLabReferenceRange";
import {
  evaluateLabReferenceContextCompatibility,
  shouldShowPersistentLabReferenceBand,
} from "../sourceContext/evaluateLabReferenceContextCompatibility";
import { normalizeLabReferenceRaw } from "../sourceContext/evaluateLabSourceReferenceContext";
import type { LabTrendGraphEligibility, LabTrendPoint } from "./labTrendTypes";
import type {
  LabChartReferenceOverlay,
  LabChartReferenceOverlayScope,
} from "./labReferenceOverlayTypes";

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

function shortProvider(name: string | null): string {
  if (!name) return "Laboratory";
  return /quest/i.test(name) ? "Quest" : name.replace(/\s+Diagnostics$/i, "").trim() || name;
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

  const who = shortProvider(overlay.providerName);

  if (overlay.kind === "provider_categories") {
    return overlay.scope === "latest" ? `Latest ${who} categories` : `${who} categories`;
  }

  const raw = overlay.rawReference.trim();
  const unit = opts?.unit?.trim();
  const withUnit =
    unit && unit !== "none" && !raw.toLowerCase().includes(unit.toLowerCase())
      ? `${raw} ${unit}`
      : raw;
  if (overlay.scope === "latest") {
    return `Latest ${who} reference: ${withUnit}`;
  }
  return `${who} reference: ${withUnit}`;
}

function overlayFromRaw(
  rawInput: string,
  providerName: string | null,
  scope: LabChartReferenceOverlayScope,
): LabChartReferenceOverlay | null {
  const raw0 = rawInput.trim();
  if (!raw0) return null;

  const normalized = normalizeLabReferenceRaw(raw0);
  const parsed = parseLabReferenceRange(normalized);
  if (!parsed) return null;

  const structured = parsed.structured;

  if (structured.kind === "report_risk_categories") return null;
  if (structured.kind === "qualitative_expected") return null;
  if (structured.kind === "raw_only") return null;
  if (structured.kind !== "numeric_range") return null;

  const lower = structured.lower;
  const upper = structured.upper;
  // Prefer cleaned interval text for display when prefix was stripped.
  const displayRaw = normalized.trim() || raw0;

  if (lower && upper) {
    return {
      kind: "bounded",
      lower: lower.value,
      upper: upper.value,
      lowerInclusive: lower.inclusive,
      upperInclusive: upper.inclusive,
      providerName,
      rawReference: displayRaw,
      scope,
    };
  }

  if (upper && !lower) {
    return {
      kind: "upper_bound",
      upper: upper.value,
      inclusive: upper.inclusive,
      providerName,
      rawReference: displayRaw,
      scope,
    };
  }

  if (lower && !upper) {
    return {
      kind: "lower_bound",
      lower: lower.value,
      inclusive: lower.inclusive,
      providerName,
      rawReference: displayRaw,
      scope,
    };
  }

  return null;
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

  const providerName = providerNameFrom(points);
  const compatibility = evaluateLabReferenceContextCompatibility(
    points.map((p) => ({
      laboratoryName: p.laboratoryName,
      methodId: p.methodId,
      specimenType: p.specimenType,
      rawReferenceRange: p.rawReferenceRange,
    })),
  );

  if (shouldShowPersistentLabReferenceBand(compatibility)) {
    // Prefer latest raw for display wording; geometry is shared.
    const raw =
      points[points.length - 1]?.rawReferenceRange?.trim() ||
      points.find((p) => (p.rawReferenceRange ?? "").trim())?.rawReferenceRange ||
      "";
    const persistent = overlayFromRaw(raw, providerName, "persistent");
    if (persistent) return persistent;

    const normalized = normalizeLabReferenceRaw(raw);
    const parsed = parseLabReferenceRange(normalized);
    if (parsed?.structured.kind === "report_risk_categories") {
      return none("provider_categories_deferred");
    }
    if (parsed?.structured.kind === "qualitative_expected") {
      return none("qualitative");
    }
    return none("unsupported_reference_format");
  }

  // Product mode B: latest-source band when persistent history is incomplete/incompatible.
  const latest = points[points.length - 1]!;
  const latestRaw = latest.rawReferenceRange?.trim() ?? "";
  if (latestRaw) {
    const latestOverlay = overlayFromRaw(latestRaw, latest.laboratoryName ?? providerName, "latest");
    if (latestOverlay) return latestOverlay;
  }

  if (compatibility === "missing_reference") return none("missing_reference");
  return none("incompatible_reference_history");
}
