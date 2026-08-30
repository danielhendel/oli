/**
 * Consumer-safe source-attributed reference copy.
 * Never uses Oli healthy/optimal/risk language unless attributing a provider category.
 */

import type { LabSourceReferenceContext } from "./labSourceReferenceTypes";

function providerPossessive(name: string | null): string {
  if (!name) return "laboratory";
  const short = /quest/i.test(name) ? "Quest" : name.replace(/\s+Diagnostics$/i, "").trim() || name;
  return short;
}

export function formatLabSourceReferenceStatusCopy(
  context: LabSourceReferenceContext,
): string | null {
  const who = providerPossessive(context.providerName);

  switch (context.status) {
    case "within_reference":
      return context.providerName
        ? `Within ${who} reference range`
        : "Within laboratory reference range";
    case "above_reference":
      if (context.sourceFlag === "high" || context.sourceFlag === "critical_high") {
        return context.providerName ? `${who} flagged high` : "Lab flagged high";
      }
      return context.providerName
        ? `Above ${who} reference range`
        : "Above laboratory reference range";
    case "below_reference":
      if (context.sourceFlag === "low" || context.sourceFlag === "critical_low") {
        return context.providerName ? `${who} flagged low` : "Lab flagged low";
      }
      return context.providerName
        ? `Below ${who} reference range`
        : "Below laboratory reference range";
    case "provider_category": {
      const label = context.referenceLabel?.trim();
      if (!label) return null;
      const titled = label.replace(/\b\w/g, (c) => c.toUpperCase());
      return context.providerName ? `${who} category: ${titled}` : `Laboratory category: ${titled}`;
    }
    case "qualitative_expected":
      return context.referenceLabel
        ? `${who} expected result: ${context.referenceLabel}`
        : null;
    case "qualitative_unexpected":
      return context.referenceLabel
        ? `${who} expected result: ${context.referenceLabel}`
        : null;
    case "pattern_expected":
    case "pattern_non_expected":
      return context.referenceLabel
        ? `${who} expected pattern: ${context.referenceLabel}`
        : null;
    case "reference_unavailable":
      return "Reference range not available in this report";
    case "not_evaluable":
      return null;
    default:
      return null;
  }
}

export function formatLabSourceReferenceRawCopy(
  context: LabSourceReferenceContext,
  opts?: { unit?: string | null },
): string | null {
  const raw = context.referenceRaw?.trim();
  if (!raw) return null;
  const who = providerPossessive(context.providerName);
  const unit = opts?.unit?.trim();
  const withUnit =
    unit && unit !== "none" && !raw.toLowerCase().includes(unit.toLowerCase())
      ? `${raw} ${unit}`
      : raw;
  return `${who} reference: ${withUnit}`;
}

/** Compact selected-point / history helper. */
export function formatLabSourceFlagCopy(
  context: LabSourceReferenceContext,
): string | null {
  const who = providerPossessive(context.providerName);
  if (context.sourceFlag === "high" || context.sourceFlag === "critical_high") {
    return `${who} flag: High`;
  }
  if (context.sourceFlag === "low" || context.sourceFlag === "critical_low") {
    return `${who} flag: Low`;
  }
  if (context.sourceFlag === "abnormal") {
    return `${who} flag: Abnormal`;
  }
  if (context.sourceFlag === "positive") return `${who} flag: Positive`;
  if (context.sourceFlag === "negative") return `${who} flag: Negative`;
  return null;
}
