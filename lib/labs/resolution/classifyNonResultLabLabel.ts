/**
 * Classify non-result report rows (headers, risk tables, metadata, alignment debris).
 */
import type { LabCandidateResolution } from "@oli/contracts";

function normalizeLabel(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[()[\],.:;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const RISK_OR_REFERENCE = new Set([
  "desirable",
  "desirable range",
  "optimal",
  "moderate",
  "high",
  "relative risk",
  "reference range",
  "risk",
  "deficiency",
  "insufficiency",
]);

const LAB_METADATA = new Set([
  "performing site",
  "performing laboratory",
  "quest diagnostics",
  "cleveland heartlab",
  "accession",
  "specimen",
  "patient id",
]);

const METHOD_NOTE = new Set(["methodology", "method", "see note", "note"]);

/**
 * Returns a non-result resolution when the label is clearly not a lab analyte.
 * Pure + deterministic.
 */
export function classifyNonResultLabLabel(rawLabel: string): LabCandidateResolution | null {
  const n = normalizeLabel(rawLabel);
  if (!n) {
    return { kind: "malformed", reason: "value_missing" };
  }

  // Standalone specimen word from a split "Interleukin-6, Serum" row.
  if (n === "serum" || n === "plasma" || n === "whole blood") {
    return { kind: "malformed", reason: "row_alignment_failed" };
  }

  if (RISK_OR_REFERENCE.has(n) || /^(desirable|optimal|moderate)\b/.test(n)) {
    return { kind: "risk_category", relatedMetricId: null };
  }

  if (/^reference(\s+range|\s+interval)?$/.test(n) || n.endsWith(" reference range")) {
    return { kind: "reference_table", relatedMetricId: null };
  }

  if (LAB_METADATA.has(n) || /^(client|account|patient)\s*#/.test(n)) {
    return { kind: "laboratory_metadata" };
  }

  if (METHOD_NOTE.has(n) || /^see\s+(note|comment)/.test(n)) {
    return { kind: "method_note", relatedMetricId: null };
  }

  if (
    /^(lipid panel|comprehensive metabolic panel|cmp|cbc|complete blood count|thyroid|cardio iq|hormone panel)$/.test(
      n,
    )
  ) {
    return { kind: "panel_header", panelId: null };
  }

  return null;
}

export function normalizeLabAnalyteLabelForResolution(raw: string): string {
  return normalizeLabel(raw);
}
