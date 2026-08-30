/**
 * Consumer copy for Phase 3D-C metric standards.
 * Neutral language only — no Quest branding, no elite/deficient labels.
 */

import { evaluateLabMetricStandardStatus } from "./evaluateLabMetricStandard";
import type {
  LabMetricStandardDefinition,
  LabMetricStandardStatus,
} from "./labMetricStandardTypes";

export function formatLabMetricStandardStatusCopy(
  status: LabMetricStandardStatus,
): string | null {
  switch (status) {
    case "within_standard":
      return "Within standard";
    case "above_standard":
      return "Above standard";
    case "below_standard":
      return "Below standard";
    case "not_evaluable":
      return null;
    default:
      return null;
  }
}

export function formatLabMetricStandardLabelCopy(
  standard: LabMetricStandardDefinition,
): string {
  return `Standard: ${standard.standardLabel}`;
}

export function formatLabMetricStandardLines(args: {
  value: number;
  standard: LabMetricStandardDefinition | null;
}): string[] {
  if (!args.standard) return [];
  const status = evaluateLabMetricStandardStatus(args.value, args.standard);
  const lines: string[] = [];
  const statusCopy = formatLabMetricStandardStatusCopy(status);
  if (statusCopy) lines.push(statusCopy);
  lines.push(formatLabMetricStandardLabelCopy(args.standard));
  return lines;
}
