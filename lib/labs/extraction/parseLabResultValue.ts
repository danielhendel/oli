/**
 * Deterministic lab result-value parsing (Phase 3D-A).
 * Never converts inequalities to bare numbers. Never invents numeric from qualitative.
 */

import type { LabResultValue } from "@oli/contracts";

type QualitativeValue = Extract<LabResultValue, { kind: "qualitative" }>["value"];
type NotReportedReason = Extract<LabResultValue, { kind: "not_reported" }>["reason"];
type Comparator = Extract<LabResultValue, { kind: "numeric" }>["comparator"];

const QUALITATIVE_MAP: Record<string, QualitativeValue> = {
  positive: "positive",
  negative: "negative",
  detected: "detected",
  "not detected": "not_detected",
  "not-detected": "not_detected",
  reactive: "reactive",
  "non-reactive": "non_reactive",
  "non reactive": "non_reactive",
  nonreactive: "non_reactive",
  present: "present",
  absent: "absent",
  "none seen": "absent",
  yellow: "present",
  clear: "absent",
  cloudy: "present",
  turbid: "present",
};

const NOT_REPORTED_MAP: Record<string, NotReportedReason> = {
  "not applicable": "not_applicable",
  "n/a": "not_applicable",
  na: "not_applicable",
  "not ordered": "not_ordered",
  "not performed": "not_performed",
  incomputable: "incomputable",
  "unable to calculate": "incomputable",
};

const INEQUALITY_RE = /^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)\s*$/i;
const NUMERIC_RE = /^(-?\d+(?:\.\d+)?)\s*$/;
const PATTERN_RE = /^pattern\s*([a-z0-9]+)$/i;

export type ParseLabResultValueOutcome =
  | { ok: true; value: LabResultValue; confidence: number }
  | { ok: false; reason: "empty" | "ambiguous" | "unsupported"; confidence: number };

function normalizeRaw(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function comparatorFromOp(op: string): Comparator | null {
  switch (op) {
    case "<":
      return "lt";
    case "<=":
    case "≤":
      return "lte";
    case ">":
      return "gt";
    case ">=":
    case "≥":
      return "gte";
    default:
      return null;
  }
}

/**
 * Parse a lab result cell into a typed LabResultValue.
 * Does not flatten inequalities or convert qualitative strings to numbers.
 */
export function parseLabResultValue(rawInput: string): ParseLabResultValueOutcome {
  const raw = normalizeRaw(rawInput);
  if (!raw) return { ok: false, reason: "empty", confidence: 0 };

  const lower = raw.toLowerCase();

  const notReported = NOT_REPORTED_MAP[lower];
  if (notReported) {
    return { ok: true, value: { kind: "not_reported", reason: notReported }, confidence: 0.95 };
  }

  const patternMatch = PATTERN_RE.exec(lower);
  if (patternMatch) {
    return {
      ok: true,
      value: { kind: "pattern", value: `Pattern ${patternMatch[1]!.toUpperCase()}` },
      confidence: 0.95,
    };
  }

  const qualitative = QUALITATIVE_MAP[lower];
  if (qualitative) {
    return {
      ok: true,
      value: { kind: "qualitative", value: qualitative, rawValue: raw },
      confidence: 0.95,
    };
  }

  const ineq = INEQUALITY_RE.exec(raw);
  if (ineq) {
    const comparator = comparatorFromOp(ineq[1]!);
    const num = Number(ineq[2]);
    if (!comparator || !Number.isFinite(num)) {
      return { ok: false, reason: "ambiguous", confidence: 0.2 };
    }
    return {
      ok: true,
      value: { kind: "numeric", value: num, comparator },
      confidence: 0.98,
    };
  }

  const numeric = NUMERIC_RE.exec(raw);
  if (numeric) {
    const num = Number(numeric[1]);
    if (!Number.isFinite(num)) return { ok: false, reason: "ambiguous", confidence: 0.2 };
    return {
      ok: true,
      value: { kind: "numeric", value: num, comparator: "eq" },
      confidence: 0.99,
    };
  }

  if (/[a-zA-Z]/.test(raw) && !/\d/.test(raw)) {
    return { ok: true, value: { kind: "text", value: raw }, confidence: 0.6 };
  }

  return { ok: false, reason: "unsupported", confidence: 0.3 };
}
