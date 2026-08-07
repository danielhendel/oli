/**
 * Evaluate source-report reference / flag / category context for a lab result.
 * Pure — no Firebase, network, or UI.
 */

import type { LabReferenceIntervalCandidate, LabResultValue } from "@oli/contracts";
import { parseLabReferenceRange } from "../extraction/parseLabReferenceRange";
import type {
  LabSourceFlag,
  LabSourceProviderCategory,
  LabSourceReferenceContext,
  LabSourceReferenceStatus,
} from "./labSourceReferenceTypes";

export type LabSourceReferenceInput = {
  result: LabResultValue | null | undefined;
  rawReferenceRange?: string | null;
  structuredReferenceRange?: LabReferenceIntervalCandidate | null;
  normalizedFlag?: string | null;
  rawFlag?: string | null;
  laboratoryName?: string | null;
  providerCategoryLabel?: string | null;
};

/** Normalize Quest "OR =" grammar before interval parse. */
export function normalizeLabReferenceRaw(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/>\s*OR\s*=/gi, ">=")
    .replace(/<\s*OR\s*=/gi, "<=")
    .replace(/≥\s*OR\s*=/gi, ">=")
    .replace(/≤\s*OR\s*=/gi, "<=");
}

function mapSourceFlag(normalized: string | null | undefined, raw: string | null | undefined): LabSourceFlag {
  const n = (normalized ?? "").toLowerCase();
  if (
    n === "high" ||
    n === "low" ||
    n === "critical_high" ||
    n === "critical_low" ||
    n === "abnormal" ||
    n === "normal" ||
    n === "positive" ||
    n === "negative" ||
    n === "none" ||
    n === "unknown"
  ) {
    return n;
  }
  const r = (raw ?? "").trim().toUpperCase();
  if (r === "H" || r === "HIGH" || r === "HH") return r === "HH" ? "critical_high" : "high";
  if (r === "L" || r === "LOW" || r === "LL") return r === "LL" ? "critical_low" : "low";
  if (r === "A" || r === "ABNORMAL") return "abnormal";
  if (!r) return "none";
  return "unknown";
}

function mapProviderCategory(label: string | null | undefined): LabSourceProviderCategory {
  if (!label) return null;
  const t = label.trim().toLowerCase();
  if (/optimal|desirable/.test(t)) return "optimal";
  if (/moderate|near\s*optimal|borderline/.test(t)) return "moderate";
  if (/^high(\s+risk)?$|high risk/.test(t)) return "high";
  if (/^low(\s+risk)?$/.test(t)) return "low";
  if (/normal/.test(t)) return "normal";
  if (/abnormal/.test(t)) return "abnormal";
  return "other";
}

function boundOk(
  value: number,
  bound: { value: number; inclusive: boolean } | undefined,
  side: "lower" | "upper",
): boolean | null {
  if (!bound) return null;
  if (side === "lower") {
    return bound.inclusive ? value >= bound.value : value > bound.value;
  }
  return bound.inclusive ? value <= bound.value : value < bound.value;
}

function evaluateNumericAgainstRange(
  value: number,
  structured: Extract<LabReferenceIntervalCandidate, { kind: "numeric_range" }>,
): LabSourceReferenceStatus {
  const lowerOk = boundOk(value, structured.lower, "lower");
  const upperOk = boundOk(value, structured.upper, "upper");
  if (lowerOk === false) return "below_reference";
  if (upperOk === false) return "above_reference";
  if (lowerOk === true || upperOk === true) return "within_reference";
  return "not_evaluable";
}

function matchRiskCategory(
  value: number,
  categories: readonly { label: string; condition: string }[],
): string | null {
  for (const cat of categories) {
    const parsed = parseLabReferenceRange(normalizeLabReferenceRaw(cat.condition));
    if (!parsed || parsed.structured.kind !== "numeric_range") continue;
    const status = evaluateNumericAgainstRange(value, parsed.structured);
    if (status === "within_reference") return cat.label;
  }
  return null;
}

function qualitativeMatch(
  resultValue: string,
  expected: readonly string[],
): LabSourceReferenceStatus {
  const norm = resultValue.trim().toLowerCase();
  const hit = expected.some((e) => e.trim().toLowerCase() === norm);
  return hit ? "qualitative_expected" : "qualitative_unexpected";
}

function patternMatch(resultValue: string, expectedRaw: string | null): LabSourceReferenceStatus {
  if (!expectedRaw) return "not_evaluable";
  const expected = expectedRaw.replace(/^expected\s*:?\s*/i, "").trim();
  if (!expected) return "not_evaluable";
  return resultValue.trim().toLowerCase() === expected.toLowerCase()
    ? "pattern_expected"
    : "pattern_non_expected";
}

export function evaluateLabSourceReferenceContext(
  input: LabSourceReferenceInput,
): LabSourceReferenceContext {
  const providerName = input.laboratoryName?.trim() || null;
  const sourceFlag = mapSourceFlag(input.normalizedFlag, input.rawFlag);
  const rawRef = input.rawReferenceRange?.trim() || null;
  const normalizedRaw = rawRef ? normalizeLabReferenceRaw(rawRef) : null;

  let structured =
    input.structuredReferenceRange ??
    (normalizedRaw ? parseLabReferenceRange(normalizedRaw)?.structured ?? null : null);

  const explicitCategory = mapProviderCategory(input.providerCategoryLabel);
  if (explicitCategory) {
    return {
      status: "provider_category",
      providerName,
      referenceLabel: input.providerCategoryLabel?.trim() || null,
      referenceRaw: rawRef,
      providerCategory: explicitCategory,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  const result = input.result ?? null;
  if (!result) {
    return {
      status: rawRef ? "not_evaluable" : "reference_unavailable",
      providerName,
      referenceLabel: null,
      referenceRaw: rawRef,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  // Censored numeric comparators — do not invent exact within/above/below.
  if (result.kind === "numeric" && result.comparator !== "eq") {
    return {
      status: "not_evaluable",
      providerName,
      referenceLabel: null,
      referenceRaw: rawRef,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  if (structured?.kind === "report_risk_categories" && result.kind === "numeric") {
    const matched = matchRiskCategory(result.value, structured.categories);
    if (matched) {
      return {
        status: "provider_category",
        providerName,
        referenceLabel: matched,
        referenceRaw: rawRef,
        providerCategory: mapProviderCategory(matched),
        sourceFlag,
        source: "laboratory_report",
      };
    }
  }

  if (structured?.kind === "numeric_range" && result.kind === "numeric") {
    const status = evaluateNumericAgainstRange(result.value, structured);
    return {
      status,
      providerName,
      referenceLabel: null,
      referenceRaw: rawRef,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  if (structured?.kind === "qualitative_expected") {
    if (result.kind === "qualitative" || result.kind === "text") {
      return {
        status: qualitativeMatch(result.value, structured.expectedValues),
        providerName,
        referenceLabel: structured.expectedValues.join(", "),
        referenceRaw: rawRef,
        providerCategory: null,
        sourceFlag,
        source: "laboratory_report",
      };
    }
  }

  if (result.kind === "pattern") {
    return {
      status: patternMatch(result.value, rawRef),
      providerName,
      referenceLabel: rawRef,
      referenceRaw: rawRef,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  // Flag-only fallback when range cannot be evaluated.
  if (sourceFlag === "high" || sourceFlag === "critical_high") {
    return {
      status: "above_reference",
      providerName,
      referenceLabel: null,
      referenceRaw: rawRef,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }
  if (sourceFlag === "low" || sourceFlag === "critical_low") {
    return {
      status: "below_reference",
      providerName,
      referenceLabel: null,
      referenceRaw: rawRef,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  if (!rawRef && !structured) {
    return {
      status: "reference_unavailable",
      providerName,
      referenceLabel: null,
      referenceRaw: null,
      providerCategory: null,
      sourceFlag,
      source: "laboratory_report",
    };
  }

  return {
    status: "not_evaluable",
    providerName,
    referenceLabel: null,
    referenceRaw: rawRef,
    providerCategory: null,
    sourceFlag,
    source: "laboratory_report",
  };
}
