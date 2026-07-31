/**
 * Deterministic reference-interval candidate parsing (Phase 3D-A).
 * Raw range remains authoritative for display; structured candidate is optional.
 */

import type { LabReferenceIntervalCandidate } from "../../contracts/labsOs";

export type ParseReferenceRangeOutcome = {
  structured: LabReferenceIntervalCandidate;
  confidence: number;
};

const CLOSED_RANGE_RE =
  /^(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)(?:\s*(.+))?$/i;
const UPPER_ONLY_RE = /^(?:<|>|<=|>=|≤|≥)\s*(-?\d+(?:\.\d+)?)(?:\s*(.+))?$/i;
const LOWER_ONLY_RE = /^(?:>=|>|≥)\s*(-?\d+(?:\.\d+)?)(?:\s*(.+))?$/i;
const OR_LESS_RE = /^(-?\d+(?:\.\d+)?)\s*or\s*less(?:\s*(.+))?$/i;
const OR_GREATER_RE = /^(-?\d+(?:\.\d+)?)\s*or\s*greater(?:\s*(.+))?$/i;

function rawOnly(raw: string, confidence = 0.5): ParseReferenceRangeOutcome {
  return { structured: { kind: "raw_only", raw }, confidence };
}

/**
 * Parse a report reference range string when deterministic.
 * Ambiguous input becomes raw_only — never invent bounds.
 */
export function parseLabReferenceRange(
  rawInput: string | null | undefined,
): ParseReferenceRangeOutcome | null {
  if (rawInput == null) return null;
  const raw = rawInput.trim().replace(/\s+/g, " ");
  if (!raw) return null;

  // Risk category tables — preserve as labeled report categories, not Oli ranges.
  if (/optimal|moderate|high risk|desirable|near optimal/i.test(raw) && /[;<>=]/.test(raw)) {
    const parts = raw.split(/[;|]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const categories = parts.map((part) => {
        const m = /^([^:<>=]+)[:\s]+(.+)$/i.exec(part);
        if (m) return { label: m[1]!.trim(), condition: m[2]!.trim() };
        return { label: part, condition: part };
      });
      return {
        structured: { kind: "report_risk_categories", categories },
        confidence: 0.7,
      };
    }
  }

  const qualitativeExpected = /^(negative|non-reactive|not detected|absent)$/i.exec(raw);
  if (qualitativeExpected) {
    return {
      structured: { kind: "qualitative_expected", expectedValues: [raw] },
      confidence: 0.9,
    };
  }

  const closed = CLOSED_RANGE_RE.exec(raw);
  if (closed) {
    const lower = Number(closed[1]);
    const upper = Number(closed[2]);
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) {
      return rawOnly(raw, 0.4);
    }
    const unit = closed[3]?.trim() || undefined;
    return {
      structured: {
        kind: "numeric_range",
        lower: { value: lower, inclusive: true },
        upper: { value: upper, inclusive: true },
        ...(unit ? { unit } : {}),
      },
      confidence: 0.95,
    };
  }

  const orLess = OR_LESS_RE.exec(raw);
  if (orLess) {
    const upper = Number(orLess[1]);
    if (!Number.isFinite(upper)) return rawOnly(raw, 0.4);
    const unit = orLess[2]?.trim() || undefined;
    return {
      structured: {
        kind: "numeric_range",
        upper: { value: upper, inclusive: true },
        ...(unit ? { unit } : {}),
      },
      confidence: 0.9,
    };
  }

  const orGreater = OR_GREATER_RE.exec(raw);
  if (orGreater) {
    const lower = Number(orGreater[1]);
    if (!Number.isFinite(lower)) return rawOnly(raw, 0.4);
    const unit = orGreater[2]?.trim() || undefined;
    return {
      structured: {
        kind: "numeric_range",
        lower: { value: lower, inclusive: true },
        ...(unit ? { unit } : {}),
      },
      confidence: 0.9,
    };
  }

  const upperOnly = UPPER_ONLY_RE.exec(raw);
  if (upperOnly && /^[<<≤]/.test(raw)) {
    const upper = Number(upperOnly[1]);
    if (!Number.isFinite(upper)) return rawOnly(raw, 0.4);
    const inclusive = /^<=|≤/.test(raw);
    const unit = upperOnly[2]?.trim() || undefined;
    return {
      structured: {
        kind: "numeric_range",
        upper: { value: upper, inclusive },
        ...(unit ? { unit } : {}),
      },
      confidence: 0.9,
    };
  }

  const lowerOnly = LOWER_ONLY_RE.exec(raw);
  if (lowerOnly && /^[>≥]/.test(raw)) {
    const lower = Number(lowerOnly[1]);
    if (!Number.isFinite(lower)) return rawOnly(raw, 0.4);
    const inclusive = /^>=|≥/.test(raw);
    const unit = lowerOnly[2]?.trim() || undefined;
    return {
      structured: {
        kind: "numeric_range",
        lower: { value: lower, inclusive },
        ...(unit ? { unit } : {}),
      },
      confidence: 0.9,
    };
  }

  return rawOnly(raw, 0.55);
}
