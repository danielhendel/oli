/**
 * Explicit Cardio IQ column/value roles — never infer projection eligibility from comparator alone.
 */

import type { CardioIqValueRole, LabResultValue } from "@oli/contracts";

export function isCardioIqContext(args: {
  panelName?: string | null;
  pageNumber?: number;
  cardioIqPages?: readonly number[];
}): boolean {
  if (args.panelName && /cardio\s*iq|cleveland\s+heartlab|relative\s+risk/i.test(args.panelName)) {
    return true;
  }
  if (
    args.pageNumber != null &&
    args.cardioIqPages != null &&
    args.cardioIqPages.includes(args.pageNumber)
  ) {
    return true;
  }
  return false;
}

/**
 * Assign a source value role for a parsed cell.
 *
 * Cardio IQ opposing threshold pairs are not extracted as candidates (parser returns no value).
 * A remaining single inequality on Cardio IQ may be a censored current result (e.g. Lp(a) <4)
 * and must stay current_result — reference bands are withheld earlier or via resolution.
 */
export function assignSourceValueRole(args: {
  isCardioIq: boolean;
  isHistorical: boolean;
  result: LabResultValue;
}): CardioIqValueRole {
  if (args.isHistorical) return "historical_result";
  if (args.result.kind === "pattern" || args.result.kind === "qualitative") {
    return "current_result";
  }
  if (args.result.kind === "not_reported" || args.result.kind === "text") {
    return "current_result";
  }
  if (args.result.kind !== "numeric") return "unknown";
  // Equality and censored inequalities are patient current results unless marked otherwise.
  void args.isCardioIq;
  return "current_result";
}

export function isProjectableSourceValueRole(role: CardioIqValueRole | null | undefined): boolean {
  return role === "current_result" || role == null;
}

export function isReferenceSourceValueRole(role: CardioIqValueRole | null | undefined): boolean {
  return (
    role === "reference_optimal" ||
    role === "reference_moderate" ||
    role === "reference_high" ||
    role === "reference_general"
  );
}

/** Explicit reference-band marker for rows that must never project. */
export function markReferenceSourceValueRole(
  comparator: "lt" | "lte" | "gt" | "gte",
): CardioIqValueRole {
  if (comparator === "lt" || comparator === "lte") return "reference_optimal";
  return "reference_high";
}
