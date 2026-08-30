/**
 * Whether a persistent graph reference band would be compatible across history.
 */

import { parseLabReferenceRange } from "../extraction/parseLabReferenceRange";
import type { LabReferenceContextCompatibility } from "./labSourceReferenceTypes";
import { normalizeLabReferenceRaw } from "./evaluateLabSourceReferenceContext";

export type LabReferenceCompatibilityPoint = {
  laboratoryName?: string | null;
  methodId?: string | null;
  specimenType?: string | null;
  rawReferenceRange?: string | null;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Semantic fingerprint for numeric reference geometry.
 * Treats "<200", "< 200", "<200 mg/dL", "Reference Range: <200" as the same upper bound.
 * Does not equate genuinely different thresholds (e.g. <200 vs <190).
 */
export function labReferenceGeometryKey(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const normalized = normalizeLabReferenceRaw(trimmed);
  const parsed = parseLabReferenceRange(normalized);
  const structured = parsed?.structured;
  if (structured?.kind === "numeric_range") {
    const lower = structured.lower;
    const upper = structured.upper;
    if (lower && upper) {
      return `bounded:${lower.inclusive ? "i" : "e"}${lower.value}:${upper.inclusive ? "i" : "e"}${upper.value}`;
    }
    if (upper && !lower) {
      return `upper:${upper.inclusive ? "i" : "e"}${upper.value}`;
    }
    if (lower && !upper) {
      return `lower:${lower.inclusive ? "i" : "e"}${lower.value}`;
    }
  }
  // Fallback: strip units / punctuation noise while preserving numbers and comparators.
  const cleaned = normalized
    .toLowerCase()
    .replace(/\b(mg\/dl|mg\/l|ng\/dl|ng\/ml|g\/dl|mmol\/l|mcg\/l|u\/l|iu\/l|%)\b/gi, "")
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-");
  return cleaned.length > 0 ? `raw:${cleaned}` : null;
}

export function evaluateLabReferenceContextCompatibility(
  points: readonly LabReferenceCompatibilityPoint[],
): LabReferenceContextCompatibility {
  if (points.length === 0) return "missing_reference";

  const withRef = points.filter((p) => norm(p.rawReferenceRange).length > 0);
  if (withRef.length === 0) return "missing_reference";
  if (withRef.length < points.length) return "missing_reference";

  const labs = new Set(withRef.map((p) => norm(p.laboratoryName) || "unknown"));
  if (labs.size > 1) return "different_lab";

  const methods = new Set(
    withRef
      .map((p) => norm(p.methodId))
      .filter((m) => m.length > 0),
  );
  if (methods.size > 1) return "different_method";

  const specimens = new Set(
    withRef
      .map((p) => norm(p.specimenType))
      .filter((s) => s.length > 0 && s !== "unknown"),
  );
  if (specimens.size > 1) return "different_specimen";

  const keys = withRef.map((p) => labReferenceGeometryKey(p.rawReferenceRange));
  if (keys.some((k) => k == null)) return "not_comparable";
  const distinct = new Set(keys);
  if (distinct.size > 1) return "different_reference";

  return "compatible_same_reference";
}

/** Persistent shading is allowed only for fully compatible same-reference series. */
export function shouldShowPersistentLabReferenceBand(
  compatibility: LabReferenceContextCompatibility,
): boolean {
  return compatibility === "compatible_same_reference";
}
