/**
 * Compact projection of the approved engine outputs (resolver + Health + Performance-Supporting)
 * used by the bundle-based protocols (BCV-006/007/016/017/031).
 */

import { buildBundle, resolveAndScore } from "./scoringBundle";
import type { BundleSpec, FullScore } from "./scoringBundle";

export type EngineView = {
  healthScore: number | null;
  H1: number | null;
  H2: number | null;
  H3: number | null;
  healthStatus: string;
  healthReason: string | null;
  perfScore: number | null;
  P1: number | null;
  P3: number | null;
  perfStatus: string;
  perfReason: string | null;
  /** P1 normalized from natural policy_not_frozen (known Resolver behaviour). */
  p1Normalized: boolean;
};

export function viewFromScore(fs: FullScore): EngineView {
  const h = fs.health;
  const p = fs.performance;
  return {
    healthScore: h.score,
    H1: h.constructScores.H1.value,
    H2: h.constructScores.H2.value,
    H3: h.constructScores.H3.value,
    healthStatus: h.status,
    healthReason: h.primaryReason,
    perfScore: p.score,
    P1: p.constructScores.P1.value,
    P3: p.constructScores.P3.value,
    perfStatus: p.status,
    perfReason: p.primaryReason,
    p1Normalized: fs.p1Normalized,
  };
}

export function engineView(spec: BundleSpec): EngineView {
  return viewFromScore(resolveAndScore(buildBundle(spec), { normalizeP1: true }));
}

export const VIEW_NUMERIC_KEYS = ["healthScore", "H1", "H2", "H3", "perfScore", "P1", "P3"] as const;

/** max |a−b| over numeric fields; Infinity when availability differs. */
export function maxAbsViewDelta(a: EngineView, b: EngineView): number {
  let m = 0;
  for (const k of VIEW_NUMERIC_KEYS) {
    const x = a[k];
    const y = b[k];
    if (x == null && y == null) continue;
    if (x == null || y == null) return Infinity;
    m = Math.max(m, Math.abs(x - y));
  }
  return m;
}
