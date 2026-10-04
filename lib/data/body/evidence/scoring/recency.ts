/**
 * Score-layer recency / era helpers (mathematical truth freeze §3.5 / §6 / §4.8).
 * Explicit asOf only — never Date.now().
 */

import type { BodyCompositionScoreReasonCode } from "@oli/contracts";

import { DAY_MS, MAX_SCORE_CONSTRUCT_GAP_MS, MAX_SCORE_INPUT_AGE_MS } from "./constants";

export { DAY_MS, MAX_SCORE_CONSTRUCT_GAP_MS, MAX_SCORE_INPUT_AGE_MS };

export function parseAsOfMs(asOf: unknown): number | null {
  if (typeof asOf !== "string" || !asOf.trim()) return null;
  const ms = Date.parse(asOf);
  return Number.isFinite(ms) ? ms : null;
}

export function parseMeasuredAtMs(measuredAt: unknown): number | null {
  if (measuredAt == null) return null;
  if (typeof measuredAt === "number") {
    return Number.isFinite(measuredAt) ? measuredAt : null;
  }
  if (typeof measuredAt !== "string" || !measuredAt.trim()) return null;
  const ms = Date.parse(measuredAt);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Canonical measuredAt decision table (§4.8).
 * Returns null when age-dimension eligible.
 */
export function measuredAtReason(
  measuredAtMs: number | null | undefined,
  asOfMs: number | null | undefined,
): BodyCompositionScoreReasonCode | null {
  if (asOfMs == null || !Number.isFinite(asOfMs)) return "invalid_provenance";
  if (measuredAtMs == null || !Number.isFinite(measuredAtMs)) return "invalid_provenance";
  const ageMs = asOfMs - measuredAtMs;
  if (ageMs < 0) return "future_evidence";
  if (ageMs > MAX_SCORE_INPUT_AGE_MS) return "evidence_too_old";
  return null;
}

export type ScoringTimestampInput = {
  measuredAtMs: number;
  /** Verified Body Scan identity — non-null scanRef only. */
  scanRef: string | null;
};

/**
 * Same verified Body Scan only when both have equal non-null provenance.scanRef.
 * Same timestamp alone does not prove same scan.
 */
export function sameVerifiedBodyScan(
  a: ScoringTimestampInput,
  b: ScoringTimestampInput,
): boolean {
  return a.scanRef != null && b.scanRef != null && a.scanRef === b.scanRef;
}

/**
 * Era gap after forcing gap=0 for same verified Body Scan scanRef pairs
 * by treating those measuredAt values as equal for gap purposes.
 */
export function eraGapMs(inputs: readonly ScoringTimestampInput[]): number {
  if (inputs.length <= 1) return 0;

  const parent = inputs.map((_, i) => i);
  function find(i: number): number {
    let cur = i;
    while (parent[cur] !== cur) {
      const p = parent[cur];
      if (p == null) break;
      parent[cur] = parent[p] ?? p;
      cur = p;
    }
    return cur;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      const left = inputs[i];
      const right = inputs[j];
      if (left == null || right == null) continue;
      if (sameVerifiedBodyScan(left, right)) union(i, j);
    }
  }
  const groupMin = new Map<number, number>();
  for (let i = 0; i < inputs.length; i++) {
    const item = inputs[i];
    if (item == null) continue;
    const r = find(i);
    const prev = groupMin.get(r);
    if (prev == null || item.measuredAtMs < prev) {
      groupMin.set(r, item.measuredAtMs);
    }
  }
  const adjusted: number[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const minForGroup = groupMin.get(find(i));
    if (minForGroup == null) continue;
    adjusted.push(minForGroup);
  }
  if (adjusted.length === 0) return 0;
  let min = adjusted[0]!;
  let max = adjusted[0]!;
  for (let i = 1; i < adjusted.length; i++) {
    const v = adjusted[i]!;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

export function eraOk(inputs: readonly ScoringTimestampInput[]): boolean {
  if (inputs.length === 0) return true;
  return eraGapMs(inputs) <= MAX_SCORE_CONSTRUCT_GAP_MS;
}
