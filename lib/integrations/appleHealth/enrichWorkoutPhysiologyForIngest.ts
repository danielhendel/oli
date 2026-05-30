/**
 * Workout Physiology v1 — Phase B production enrichment helper.
 *
 * Given an Apple Health workout (start/end/activityId) and a HealthKit probe surface,
 * compute the summary physiology block that ingestion appends to the workout RawEvent
 * payload. This helper is the SOLE producer of:
 *
 *   - averageHeartRateBpm / maxHeartRateBpm (padded ±60s, clipped to neighbors)
 *   - heartRateZoneMinutes + heartRateZoneBasis (padded samples clipped to strict window)
 *   - postWorkoutHeartRate (HRR over [end, end+120s])
 *   - activeEnergyKcal / basalEnergyKcal / totalEnergyKcal (strict window)
 *   - physiologyVersion: 1
 *
 * Contracts:
 * - **Read-only.** Never mutates the workout, never writes Firestore, never touches canonical/derived.
 * - **Non-blocking.** Every probe call is wrapped in try/catch; failures result in OMITTED fields,
 *   never thrown errors. The workout still ingests with whatever legacy fields it already had.
 * - **No fake data.** Missing values stay absent (the returned object simply doesn't have the key).
 *   `null`/0 placeholders are never produced.
 * - **Pure.** Same inputs + same probe responses → same output.
 *
 * Out of scope (Phase C+): cadence, power, elevation, route, splits, dense time-series.
 */

import {
  classifyHrSampleToZoneIndex,
  resolveWorkoutHrZoneThresholds,
  type WorkoutHrZoneBasisModelVersion,
} from "./resolveWorkoutHrZoneThresholds";
import type {
  WorkoutForDiagnostic,
  WorkoutPhysiologyHealthKitProbe,
  WorkoutPhysiologyHrSample,
} from "./diagnoseWorkoutPhysiology";

/**
 * Summary HR window padding (ms) on each side of `[start, end]`.
 *
 * Phase A diagnostics observed Apple Watch emitting the first HR sample 30–120 s after
 * `workout.startDate`. ±60 s recovers that latency without bleeding into adjacent
 * workouts that are <2 min apart (back-to-back intervals).
 *
 * Zone-minute computation clips this padded sample set back to strict `[start, end]`
 * so the 5-tuple sums to ~`durationMinutes`.
 */
export const WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS = 60 * 1000;

/** Post-workout HRR window length: 120 s (standard 2-minute heart-rate recovery). */
export const WORKOUT_PHYSIOLOGY_POST_HR_WINDOW_SECONDS = 120;

/**
 * Feature-flag default + override convention mirrors
 * `shouldLogAppleHealthPhysiologyDiagnostics` in `diagnoseWorkoutPhysiology.ts`.
 *
 * Default: **ENABLED**. We want Phase B physiology fields on every newly ingested
 * Apple Health workout. The flag exists as a kill switch if Apple Health data
 * quality issues surface in production.
 *
 * Overrides:
 * - `process.env.AH_WORKOUT_PHYSIOLOGY_V1 === "0"` → disabled
 * - `process.env.AH_WORKOUT_PHYSIOLOGY_V1 === "1"` → enabled (matches default)
 *
 * Tests pass `enabled: true|false` explicitly.
 */
export function shouldEnableWorkoutPhysiologyV1(): boolean {
  const override = process.env.AH_WORKOUT_PHYSIOLOGY_V1;
  if (override === "0") return false;
  if (override === "1") return true;
  return true;
}

/**
 * Workout Physiology v1 — Heart-rate zone basis emitted on the raw payload.
 * Schema-aligned with `workoutHeartRateZoneBasisSchema` in `lib/contracts/rawEvent.ts`.
 */
export type WorkoutPhysiologyZoneBasis = {
  modelVersion: WorkoutHrZoneBasisModelVersion;
  thresholdsBpm: [number, number, number, number];
  userMaxHrBpm: number | null;
  computedFromSampleCount: number;
};

/** Workout Physiology v1 — Summary block emitted by {@link enrichWorkoutPhysiologyForIngest}. */
export type WorkoutPhysiologyEnrichmentBlock = {
  averageHeartRateBpm?: number;
  maxHeartRateBpm?: number;
  activeEnergyKcal?: number;
  basalEnergyKcal?: number;
  totalEnergyKcal?: number;
  heartRateZoneMinutes?: [number, number, number, number, number];
  heartRateZoneBasis?: WorkoutPhysiologyZoneBasis;
  postWorkoutHeartRate?: {
    windowSeconds: number;
    startBpm: number;
    endBpm: number;
    dropBpm: number;
    sampleCount: number;
  };
  physiologyVersion?: 1;
};

export type WorkoutPhysiologyEnrichmentOptions = {
  /** Master switch. Defaults to {@link shouldEnableWorkoutPhysiologyV1}. */
  enabled?: boolean;
  /**
   * Summary HR padding window (ms) on each side of `[start, end]`.
   * Defaults to {@link WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS} (60 s).
   * Overridable for tests.
   */
  summaryHrPaddingMs?: number;
  /** Optional userId for future personalized zone resolution; ignored in Phase B. */
  userId?: string;
  /**
   * Neighboring-workout boundaries used to clip the padded HR window so back-to-back
   * sessions don't pollute each other.
   *
   * - `priorEndIso`: latest workout end strictly **before** this workout's start. The
   *   padded start is clamped to `max(paddedStart, priorEndIso)`.
   * - `nextStartIso`: earliest workout start strictly **after** this workout's end. The
   *   padded end is clamped to `min(paddedEnd, nextStartIso)`. Also constrains the
   *   post-workout HRR window's `end`.
   *
   * Both are optional; when absent, no neighbor clipping is performed.
   */
  neighbors?: {
    priorEndIso?: string | null;
    nextStartIso?: string | null;
  };
};

/**
 * Compute the Phase B physiology block for a workout.
 *
 * Returns the additive fields to spread into the workout RawEvent payload, or `null`
 * when disabled or when no probe calls returned usable data. Never throws; never mutates.
 */
export async function enrichWorkoutPhysiologyForIngest(
  workout: Pick<
    WorkoutForDiagnostic,
    "start" | "end" | "activityId" | "activityName" | "sourceId" | "durationMinutes"
  >,
  probe: WorkoutPhysiologyHealthKitProbe,
  options: WorkoutPhysiologyEnrichmentOptions = {},
): Promise<WorkoutPhysiologyEnrichmentBlock | null> {
  const enabled = options.enabled ?? shouldEnableWorkoutPhysiologyV1();
  if (!enabled) return null;

  const paddingMs = options.summaryHrPaddingMs ?? WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS;

  const startMs = Date.parse(workout.start);
  const endMs = Date.parse(workout.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Padded HR window with neighbor clipping.
  // ---------------------------------------------------------------------------
  let paddedStartMs = startMs - paddingMs;
  let paddedEndMs = endMs + paddingMs;

  const priorEnd = options.neighbors?.priorEndIso;
  if (typeof priorEnd === "string" && priorEnd.length > 0) {
    const t = Date.parse(priorEnd);
    if (Number.isFinite(t) && t > paddedStartMs && t <= startMs) {
      paddedStartMs = t;
    }
  }
  const nextStart = options.neighbors?.nextStartIso;
  if (typeof nextStart === "string" && nextStart.length > 0) {
    const t = Date.parse(nextStart);
    if (Number.isFinite(t) && t < paddedEndMs && t >= endMs) {
      paddedEndMs = t;
    }
  }
  const paddedStartIso = new Date(paddedStartMs).toISOString();
  const paddedEndIso = new Date(paddedEndMs).toISOString();

  // ---------------------------------------------------------------------------
  // Summary HR (avg + max) over the padded, neighbor-clipped window.
  // ---------------------------------------------------------------------------
  let avgHr: number | undefined;
  let maxHr: number | undefined;
  let paddedSamples: WorkoutPhysiologyHrSample[] = [];
  if (typeof probe.queryHeartRateSamples === "function") {
    const r = await safeCall(() => probe.queryHeartRateSamples!(paddedStartIso, paddedEndIso));
    if (!("__thrown" in r) && r.ok && Array.isArray(r.samples)) {
      paddedSamples = r.samples;
      const agg = aggregateAvgMax(paddedSamples);
      if (agg.avg != null) avgHr = agg.avg;
      if (agg.max != null) maxHr = agg.max;
    }
  }

  // ---------------------------------------------------------------------------
  // Zone minutes — padded samples clipped to strict [start, end].
  // ---------------------------------------------------------------------------
  let zoneTuple: [number, number, number, number, number] | undefined;
  let zoneBasis: WorkoutPhysiologyZoneBasis | undefined;
  if (paddedSamples.length > 0) {
    const thresholds = resolveWorkoutHrZoneThresholds(
      options.userId ? { userId: options.userId } : undefined,
    );
    const zoneResult = computeHeartRateZoneMinutes(
      paddedSamples,
      startMs,
      endMs,
      thresholds.thresholdsBpm,
    );
    if (zoneResult != null) {
      zoneTuple = zoneResult.zoneMinutes;
      zoneBasis = {
        modelVersion: thresholds.modelVersion,
        thresholdsBpm: [...thresholds.thresholdsBpm] as [number, number, number, number],
        userMaxHrBpm: thresholds.userMaxHrBpm,
        computedFromSampleCount: zoneResult.usedSampleCount,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Post-workout HR recovery — [end, end + 120s], also neighbor-clipped on the right.
  // ---------------------------------------------------------------------------
  let postWorkoutHeartRate: WorkoutPhysiologyEnrichmentBlock["postWorkoutHeartRate"];
  if (typeof probe.queryHeartRateSamples === "function") {
    let recoveryEndMs = endMs + WORKOUT_PHYSIOLOGY_POST_HR_WINDOW_SECONDS * 1000;
    if (typeof nextStart === "string" && nextStart.length > 0) {
      const t = Date.parse(nextStart);
      if (Number.isFinite(t) && t < recoveryEndMs && t > endMs) {
        recoveryEndMs = t;
      }
    }
    if (recoveryEndMs > endMs) {
      const recoveryEndIso = new Date(recoveryEndMs).toISOString();
      const r = await safeCall(() => probe.queryHeartRateSamples!(workout.end, recoveryEndIso));
      if (!("__thrown" in r) && r.ok && Array.isArray(r.samples) && r.samples.length > 0) {
        const recovery = aggregateRecoveryDrop(
          r.samples,
          endMs,
          recoveryEndMs,
        );
        if (recovery != null) {
          postWorkoutHeartRate = {
            windowSeconds: Math.round((recoveryEndMs - endMs) / 1000),
            startBpm: recovery.startBpm,
            endBpm: recovery.endBpm,
            dropBpm: recovery.startBpm - recovery.endBpm,
            sampleCount: recovery.sampleCount,
          };
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Energy (active + basal) over the strict workout window.
  // ---------------------------------------------------------------------------
  let activeEnergyKcal: number | undefined;
  if (typeof probe.queryActiveEnergyKcal === "function") {
    const r = await safeCall(() => probe.queryActiveEnergyKcal!(workout.start, workout.end));
    if (
      !("__thrown" in r) &&
      r.ok &&
      r.valueKcal != null &&
      Number.isFinite(r.valueKcal) &&
      r.valueKcal >= 0
    ) {
      activeEnergyKcal = r.valueKcal;
    }
  }
  let basalEnergyKcal: number | undefined;
  if (typeof probe.queryBasalEnergyKcal === "function") {
    const r = await safeCall(() => probe.queryBasalEnergyKcal!(workout.start, workout.end));
    if (
      !("__thrown" in r) &&
      r.ok &&
      r.valueKcal != null &&
      Number.isFinite(r.valueKcal) &&
      r.valueKcal >= 0
    ) {
      basalEnergyKcal = r.valueKcal;
    }
  }
  let totalEnergyKcal: number | undefined;
  if (activeEnergyKcal != null && basalEnergyKcal != null) {
    totalEnergyKcal = activeEnergyKcal + basalEnergyKcal;
  } else if (activeEnergyKcal != null) {
    totalEnergyKcal = activeEnergyKcal;
  } else if (basalEnergyKcal != null) {
    totalEnergyKcal = basalEnergyKcal;
  }

  // Assemble — omit fields that have no value (never null/0 placeholder).
  const block: WorkoutPhysiologyEnrichmentBlock = {};
  if (avgHr != null) block.averageHeartRateBpm = avgHr;
  if (maxHr != null) block.maxHeartRateBpm = maxHr;
  if (activeEnergyKcal != null) block.activeEnergyKcal = activeEnergyKcal;
  if (basalEnergyKcal != null) block.basalEnergyKcal = basalEnergyKcal;
  if (totalEnergyKcal != null) block.totalEnergyKcal = totalEnergyKcal;
  if (zoneTuple != null && zoneBasis != null) {
    block.heartRateZoneMinutes = zoneTuple;
    block.heartRateZoneBasis = zoneBasis;
  }
  if (postWorkoutHeartRate != null) {
    block.postWorkoutHeartRate = postWorkoutHeartRate;
  }

  if (Object.keys(block).length === 0) return null;
  block.physiologyVersion = 1;
  return block;
}

// ---------------------------------------------------------------------------
// Internal helpers (pure)
// ---------------------------------------------------------------------------

function aggregateAvgMax(samples: WorkoutPhysiologyHrSample[]): {
  avg: number | null;
  max: number | null;
} {
  const values: number[] = [];
  for (const s of samples) {
    if (typeof s?.value === "number" && Number.isFinite(s.value) && s.value > 0) {
      values.push(s.value);
    }
  }
  if (values.length === 0) return { avg: null, max: null };
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / values.length);
  const max = Math.round(values.reduce((a, b) => (b > a ? b : a), values[0] ?? 0));
  return { avg, max };
}

/**
 * Compute z1..z5 minutes from a sample stream over a strict `[startMs, endMs]` window.
 *
 * Sample inclusion rules (Phase B, fail-closed):
 *
 *   - A sample with `ts >= endMs` is dropped entirely (after the workout).
 *   - A sample with `ts < startMs - WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS` is
 *     dropped (more than 60 s before the workout — too stale to carry forward;
 *     likely from a previous activity).
 *   - Otherwise the sample dwells `[max(ts, startMs), min(nextTs, endMs)]`. The
 *     last in-window sample dwells until `endMs`. Padded leading samples
 *     (`startMs - 60s ≤ ts < startMs`) anchor at `startMs` — this matches the
 *     `strictHrMissedButPaddedFound` recovery case observed in Phase A.
 *
 * Returns `null` when no in-window sample has a finite positive value.
 */
export function computeHeartRateZoneMinutes(
  samples: WorkoutPhysiologyHrSample[],
  startMs: number,
  endMs: number,
  thresholdsBpm: readonly [number, number, number, number],
): { zoneMinutes: [number, number, number, number, number]; usedSampleCount: number } | null {
  type Stamped = { ts: number; bpm: number };
  const stamped: Stamped[] = [];
  const leadingGraceMs = WORKOUT_PHYSIOLOGY_SUMMARY_HR_PADDING_MS;
  const minTs = startMs - leadingGraceMs;
  for (const s of samples) {
    if (typeof s?.value !== "number" || !Number.isFinite(s.value) || s.value <= 0) continue;
    const iso = typeof s?.startDate === "string" ? s.startDate : null;
    if (!iso) continue;
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) continue;
    if (ts >= endMs) continue;
    if (ts < minTs) continue;
    stamped.push({ ts, bpm: s.value });
  }
  if (stamped.length === 0) return null;
  stamped.sort((a, b) => a.ts - b.ts);

  const zoneMs: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let usedSampleCount = 0;

  for (let i = 0; i < stamped.length; i++) {
    const cur = stamped[i]!;
    const next = stamped[i + 1];
    let segStart = cur.ts;
    let segEnd = next ? next.ts : endMs;

    if (segStart < startMs) segStart = startMs;
    if (segEnd > endMs) segEnd = endMs;
    if (segEnd <= segStart) continue;

    const zoneIdx = classifyHrSampleToZoneIndex(cur.bpm, thresholdsBpm);
    if (zoneIdx == null) continue;

    zoneMs[zoneIdx] += segEnd - segStart;
    usedSampleCount += 1;
  }

  if (usedSampleCount === 0) return null;

  const zoneMinutes: [number, number, number, number, number] = [
    round2(zoneMs[0] / 60000),
    round2(zoneMs[1] / 60000),
    round2(zoneMs[2] / 60000),
    round2(zoneMs[3] / 60000),
    round2(zoneMs[4] / 60000),
  ];
  return { zoneMinutes, usedSampleCount };
}

/**
 * Aggregate HR drop over the recovery window `[endMs, recoveryEndMs]`.
 *
 * - `startBpm`: earliest sample with a finite positive value at or after `endMs`.
 * - `endBpm`: latest sample with a finite positive value within `[endMs, recoveryEndMs]`.
 * - Returns null when no usable in-window samples exist or the same sample serves both
 *   ends (requires at least one distinct later sample to call it a "recovery").
 */
function aggregateRecoveryDrop(
  samples: WorkoutPhysiologyHrSample[],
  endMs: number,
  recoveryEndMs: number,
): { startBpm: number; endBpm: number; sampleCount: number } | null {
  let firstTs = Number.POSITIVE_INFINITY;
  let firstBpm: number | null = null;
  let lastTs = Number.NEGATIVE_INFINITY;
  let lastBpm: number | null = null;
  let count = 0;

  for (const s of samples) {
    if (typeof s?.value !== "number" || !Number.isFinite(s.value) || s.value <= 0) continue;
    const iso = typeof s?.startDate === "string" ? s.startDate : null;
    if (!iso) continue;
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) continue;
    if (ts < endMs || ts > recoveryEndMs) continue;

    count += 1;
    if (ts < firstTs) {
      firstTs = ts;
      firstBpm = s.value;
    }
    if (ts > lastTs) {
      lastTs = ts;
      lastBpm = s.value;
    }
  }

  if (count === 0 || firstBpm == null || lastBpm == null || firstTs === lastTs) {
    return null;
  }
  return {
    startBpm: Math.round(firstBpm),
    endBpm: Math.round(lastBpm),
    sampleCount: count,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function safeCall<T>(
  fn: () => Promise<T>,
): Promise<T | { __thrown: string }> {
  try {
    return await fn();
  } catch (e) {
    return { __thrown: e instanceof Error ? e.message : String(e) };
  }
}
