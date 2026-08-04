/**
 * Strict specimen resolver for lab analyte labels / metric ids.
 * Explicit specimen suffixes win; conflicting identities fail closed (null).
 */

import type { LabSpecimenType } from "@oli/contracts";

export function resolveLabSpecimenType(args: {
  rawLabel: string;
  metricId?: string | null;
}): LabSpecimenType | null {
  const label = args.rawLabel.toLowerCase();
  const metric = (args.metricId ?? "").toLowerCase();

  const fromMetric: LabSpecimenType | null = metric.includes("urine")
    ? "urine"
    : metric.includes("serum")
      ? "serum"
      : metric.includes("plasma")
        ? "plasma"
        : metric.includes("blood") || metric.includes("whole_blood")
          ? "whole_blood"
          : null;

  let fromLabel: LabSpecimenType | null = null;
  if (/\(u\)|\burine\b/.test(label)) fromLabel = "urine";
  else if (/\bserum\b/.test(label)) fromLabel = "serum";
  else if (/\bplasma\b/.test(label)) fromLabel = "plasma";
  else if (/\bblood\b|\bwhole\s*blood\b/.test(label)) fromLabel = "whole_blood";

  if (fromLabel && fromMetric && fromLabel !== fromMetric) {
    return null;
  }
  return fromLabel ?? fromMetric;
}
