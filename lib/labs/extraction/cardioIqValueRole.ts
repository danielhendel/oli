/**
 * Explicit Cardio IQ column/value roles — never infer projection eligibility from comparator alone.
 */

import type { CardioIqCellRole, CardioIqValueRole, LabResultValue } from "@oli/contracts";

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
 * Cardio IQ summary legend rows (Optimal A / High B) are not patient current results.
 * Example: "LDL PATTERN A N/A B Pattern"
 */
export function isCardioIqPatternLegend(args: {
  rawResult: string;
  rawRange?: string | null;
  rawUnit?: string | null;
  lineText?: string | null;
}): boolean {
  const result = args.rawResult.trim();
  const range = (args.rawRange ?? "").trim();
  const unit = (args.rawUnit ?? "").trim();
  const line = (args.lineText ?? "").trim();
  if (!/^Pattern\s+[AB]$/i.test(result)) return false;
  if (/N\/A/i.test(range) && /\b[AB]\b/i.test(range)) return true;
  if (/^Pattern$/i.test(unit) && /N\/A/i.test(range)) return true;
  if (/Relative\s+Risk:.*Pattern\s+A.*Pattern\s+B/i.test(line)) return true;
  return false;
}

export function assignCardioIqCellRole(args: {
  isCardioIq: boolean;
  isHistorical: boolean;
  isPatternLegend: boolean;
  result: LabResultValue | null;
}): CardioIqCellRole {
  if (!args.isCardioIq) return "unknown";
  if (args.isHistorical) return "historical_value";
  if (args.isPatternLegend) return "report_note";
  if (!args.result) return "unknown";
  if (args.result.kind === "pattern" || args.result.kind === "qualitative") return "current_value";
  if (args.result.kind === "numeric" && args.result.comparator === "eq") return "current_value";
  if (args.result.kind === "numeric") return "unknown";
  return "unknown";
}

/**
 * Assign a source value role for a parsed cell.
 *
 * Cardio IQ opposing threshold pairs are not extracted as candidates (parser returns no value).
 * Pattern legends are reference_general. A remaining single inequality on Cardio IQ may be a
 * censored current result (e.g. Lp(a) <4) and must stay current_result.
 */
export function assignSourceValueRole(args: {
  isCardioIq: boolean;
  isHistorical: boolean;
  isPatternLegend?: boolean;
  result: LabResultValue;
}): CardioIqValueRole {
  if (args.isHistorical) return "historical_result";
  if (args.isPatternLegend) return "reference_general";
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
