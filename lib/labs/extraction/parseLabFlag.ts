/**
 * Source-laboratory flag parsing (Phase 3D-A).
 * Does not derive Oli classifications. Calculated-from-range is labeled distinctly.
 */

import type { LabFlagCandidate, LabNormalizedFlag } from "@oli/contracts";

const FLAG_MAP: Record<string, LabNormalizedFlag> = {
  h: "high",
  high: "high",
  hi: "high",
  l: "low",
  low: "low",
  lo: "low",
  hh: "critical_high",
  "critical high": "critical_high",
  ll: "critical_low",
  "critical low": "critical_low",
  a: "abnormal",
  abnormal: "abnormal",
  n: "normal",
  normal: "normal",
  positive: "positive",
  pos: "positive",
  negative: "negative",
  neg: "negative",
};

export function parseLabFlagCandidate(rawFlag: string | null | undefined): LabFlagCandidate {
  if (rawFlag == null || !String(rawFlag).trim()) {
    return {
      rawFlag: null,
      normalized: "none",
      source: "report_flag",
      confidence: 1,
    };
  }
  const raw = String(rawFlag).trim();
  const key = raw.toLowerCase();
  const normalized = FLAG_MAP[key];
  if (normalized) {
    return {
      rawFlag: raw,
      normalized,
      source: "report_flag",
      confidence: 0.95,
    };
  }

  // Provider-specific category labels (e.g. "Optimal") — preserve, do not call Oli class.
  if (/optimal|moderate|high risk|desirable|borderline/i.test(raw)) {
    return {
      rawFlag: raw,
      normalized: "provider_category",
      source: "report_flag",
      confidence: 0.8,
    };
  }

  return {
    rawFlag: raw,
    normalized: "unknown",
    source: "report_flag",
    confidence: 0.4,
  };
}
