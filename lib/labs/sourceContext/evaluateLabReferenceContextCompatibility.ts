/**
 * Whether a persistent graph reference band would be compatible across history.
 * Preferred 3D-C default remains: no persistent band.
 */

import type { LabReferenceContextCompatibility } from "./labSourceReferenceTypes";

export type LabReferenceCompatibilityPoint = {
  laboratoryName?: string | null;
  methodId?: string | null;
  specimenType?: string | null;
  rawReferenceRange?: string | null;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
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

  const ranges = new Set(withRef.map((p) => norm(p.rawReferenceRange)));
  if (ranges.size > 1) return "different_reference";

  return "compatible_same_reference";
}

/** Persistent shading is allowed only for fully compatible same-reference series. */
export function shouldShowPersistentLabReferenceBand(
  compatibility: LabReferenceContextCompatibility,
): boolean {
  return compatibility === "compatible_same_reference";
}
