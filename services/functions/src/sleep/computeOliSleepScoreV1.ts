/**
 * Oli Sleep Score v1 — pure, deterministic. Inputs must come from DailyFacts.sleep only.
 */

import type { DailySleepFacts } from "../types/health";
import type { OliSleepScoreV1 } from "@oli/contracts";
import { OLI_SLEEP_SCORE_VERSION } from "@oli/contracts";

const BASE_WEIGHTS = {
  duration: 0.4,
  efficiency: 0.2,
  latency: 0.15,
  rem: 0.125,
  deep: 0.125,
} as const;

function interpolate(points: readonly [number, number][], x: number): number {
  if (points.length === 0) return 0;
  const head = points[0];
  if (!head) return 0;
  if (x <= head[0]) return head[1];
  const last = points[points.length - 1];
  if (last && x >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const [x0, y0] = a;
    const [x1, y1] = b;
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last?.[1] ?? 0;
}

/** Duration minutes → [0,1] */
export function normalizeSleepDurationMinutes(minutes: number): number {
  if (minutes <= 240) return 0;
  if (minutes >= 480) return 1;
  const pts: [number, number][] = [
    [240, 0],
    [300, 0.35],
    [360, 0.65],
    [420, 0.9],
    [480, 1],
  ];
  return interpolate(pts, minutes);
}

/** Efficiency 0–1 (or percent as >1); output [0,1] */
export function normalizeSleepEfficiencyRatio(eff: number): number {
  let r = eff;
  if (r > 1 && r <= 100) r = r / 100;
  if (r > 1) r = 1;
  if (r < 0.7) return 0;
  if (r > 0.95) return 1;
  const pts: [number, number][] = [
    [0.7, 0],
    [0.8, 0.5],
    [0.85, 0.75],
    [0.9, 0.9],
    [0.95, 1],
  ];
  return interpolate(pts, r);
}

/** Latency minutes; lower latency → higher score */
export function normalizeSleepLatencyMinutes(latencyMin: number): number {
  if (latencyMin <= 10) return 1;
  if (latencyMin >= 60) return 0;
  const pts: [number, number][] = [
    [10, 1],
    [20, 0.8],
    [30, 0.6],
    [45, 0.3],
    [60, 0],
  ];
  return interpolate(pts, latencyMin);
}

/** REM minutes / duration */
export function normalizeRemRatio(ratio: number): number {
  const pts: [number, number][] = [
    [0.1, 0.2],
    [0.15, 0.6],
    [0.2, 0.85],
    [0.25, 1],
    [0.3, 0.9],
    [0.35, 0.75],
  ];
  const low = pts[0];
  if (!low) return 0;
  if (ratio <= low[0]) return low[1];
  const last = pts[pts.length - 1];
  if (last && ratio >= last[0]) return last[1];
  return interpolate(pts, ratio);
}

export function normalizeDeepRatio(ratio: number): number {
  const pts: [number, number][] = [
    [0.08, 0.2],
    [0.12, 0.65],
    [0.18, 1],
    [0.22, 0.9],
    [0.28, 0.75],
  ];
  const low = pts[0];
  if (!low) return 0;
  if (ratio <= low[0]) return low[1];
  const last = pts[pts.length - 1];
  if (last && ratio >= last[0]) return last[1];
  return interpolate(pts, ratio);
}

export type ComputeOliSleepScoreV1Input = {
  sleep: DailySleepFacts | undefined;
  /** Optional domain confidence for sleep (0–1), from enrichDailyFacts */
  domainConfidenceSleep?: number;
  computedAt: string;
};

/**
 * Returns null when there is no sleep facts object; otherwise always returns a versioned document
 * (value may be null per confidence / duration rules).
 */
export function computeOliSleepScoreV1(input: ComputeOliSleepScoreV1Input): OliSleepScoreV1 | null {
  const { sleep, domainConfidenceSleep, computedAt } = input;
  if (!sleep) return null;

  const durationSource =
    typeof sleep.mainSleepMinutes === "number" && sleep.mainSleepMinutes > 0
      ? sleep.mainSleepMinutes
      : typeof sleep.totalMinutes === "number" && sleep.totalMinutes > 0
        ? sleep.totalMinutes
        : undefined;

  const reasons: string[] = [];

  if (durationSource === undefined || durationSource <= 0) {
    return {
      value: null,
      version: OLI_SLEEP_SCORE_VERSION,
      computedAt,
      confidence: 0,
      components: {
        duration: null,
        efficiency: null,
        latency: null,
        rem: null,
        deep: null,
      },
      weights: { ...BASE_WEIGHTS },
      reasons: ["Stage data was incomplete, so no Oli score is shown."],
    };
  }

  let confidence = 1;

  const hasEff = typeof sleep.efficiency === "number" && Number.isFinite(sleep.efficiency);
  const hasLat = typeof sleep.latencyMinutes === "number" && Number.isFinite(sleep.latencyMinutes);
  const hasRem =
    typeof sleep.remSleepMinutes === "number" &&
    sleep.remSleepMinutes >= 0 &&
    Number.isFinite(sleep.remSleepMinutes);
  const hasDeep =
    typeof sleep.deepSleepMinutes === "number" &&
    sleep.deepSleepMinutes >= 0 &&
    Number.isFinite(sleep.deepSleepMinutes);

  if (!hasEff) confidence -= 0.2;
  if (!hasLat) confidence -= 0.15;
  if (!hasRem) confidence -= 0.15;
  if (!hasDeep) confidence -= 0.15;

  if (domainConfidenceSleep !== undefined && domainConfidenceSleep < 0.5) {
    confidence -= 0.2;
  }

  confidence = Math.max(0, Math.min(1, confidence));

  const cDur = normalizeSleepDurationMinutes(durationSource);
  const cEff = hasEff ? normalizeSleepEfficiencyRatio(sleep.efficiency as number) : null;
  const cLat = hasLat ? normalizeSleepLatencyMinutes(sleep.latencyMinutes as number) : null;
  const remRatio = hasRem ? (sleep.remSleepMinutes as number) / durationSource : null;
  const deepRatio = hasDeep ? (sleep.deepSleepMinutes as number) / durationSource : null;
  const cRem = remRatio !== null ? normalizeRemRatio(remRatio) : null;
  const cDeep = deepRatio !== null ? normalizeDeepRatio(deepRatio) : null;

  const active: Partial<Record<keyof typeof BASE_WEIGHTS, number>> = {};
  active.duration = BASE_WEIGHTS.duration;
  if (cEff !== null) active.efficiency = BASE_WEIGHTS.efficiency;
  if (cLat !== null) active.latency = BASE_WEIGHTS.latency;
  if (cRem !== null) active.rem = BASE_WEIGHTS.rem;
  if (cDeep !== null) active.deep = BASE_WEIGHTS.deep;

  const weightSum = Object.values(active).reduce((s, w) => s + w, 0);
  const normWeights = {
    duration: (active.duration ?? 0) / weightSum,
    efficiency: (active.efficiency ?? 0) / weightSum,
    latency: (active.latency ?? 0) / weightSum,
    rem: (active.rem ?? 0) / weightSum,
    deep: (active.deep ?? 0) / weightSum,
  };

  let weighted =
    normWeights.duration * cDur +
    (cEff !== null ? normWeights.efficiency * cEff : 0) +
    (cLat !== null ? normWeights.latency * cLat : 0) +
    (cRem !== null ? normWeights.rem * cRem : 0) +
    (cDeep !== null ? normWeights.deep * cDeep : 0);

  if (!Number.isFinite(weighted)) weighted = 0;

  let value: number | null = Math.round(weighted * 100);
  if (confidence < 0.5) {
    value = null;
    reasons.length = 0;
    reasons.push("Stage data was incomplete, so no Oli score is shown.");
  } else {
    if (cDur >= 0.85) reasons.push("Sleep duration was strong.");
    if (cEff !== null && cEff < 0.5) reasons.push("Sleep efficiency was below target.");
    if (cLat !== null && cLat < 0.5) reasons.push("Sleep latency was higher than ideal.");
    if (cDeep !== null && cDeep < 0.45) reasons.push("Deep sleep contribution was low.");
    if (reasons.length === 0) {
      reasons.push("Based on your sleep duration and available stage metrics.");
    }
  }

  return {
    value,
    version: OLI_SLEEP_SCORE_VERSION,
    computedAt,
    confidence,
    components: {
      duration: cDur,
      efficiency: cEff,
      latency: cLat,
      rem: cRem,
      deep: cDeep,
    },
    weights: normWeights,
    reasons: reasons.slice(0, 3),
  };
}

/** Merge score onto DailyFacts.sleep (mutates copy). */
export function attachOliSleepScoreToSleepFacts(
  sleep: DailySleepFacts,
  input: Omit<ComputeOliSleepScoreV1Input, "sleep">,
): DailySleepFacts {
  const doc = computeOliSleepScoreV1({ ...input, sleep });
  if (!doc) return sleep;
  return { ...sleep, oliSleepScore: doc };
}
