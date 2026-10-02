/**
 * Pure waist circumference history helpers (manual-first RawEvents).
 *
 * Presentation "latest" is max observedAt only — never profile bodyInputs,
 * never source ranking.
 */

import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";

export type WaistHistoryRawRow = {
  readonly id: string;
  readonly observedAt: string;
  readonly sourceId: string;
  readonly kind?: string;
  readonly payload?: unknown;
};

export type WaistHistoryPoint = {
  readonly rawEventId: string;
  readonly observedAt: string;
  readonly dayKey: string;
  readonly waistCm: number;
  readonly sourceId: string;
  readonly protocolId: string | null;
};

export type WaistHistoryStats = {
  readonly low: number | null;
  readonly high: number | null;
  readonly change: number | null;
};

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function readProtocolId(payload: Record<string, unknown>): string | null {
  const id = payload.protocolId;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Extract a single waist point from a raw-event row when
 * `payload.waistCircumferenceCm` is finite and positive.
 * Includes sourceId "manual" and any other source with waist — no Apple Health filter.
 */
export function extractWaistHistoryPoint(
  row: WaistHistoryRawRow,
  fallbackTimeZone: string,
): WaistHistoryPoint | null {
  if (row.kind != null && row.kind !== "body_composition") return null;
  const payload = row.payload;
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (!isFinitePositive(record.waistCircumferenceCm)) return null;
  const dayKey = deriveWeightPointDayKey(
    {
      ...(typeof record.time === "string" ? { time: record.time } : {}),
      ...(typeof record.timezone === "string" ? { timezone: record.timezone } : {}),
    },
    row.observedAt,
    fallbackTimeZone,
  );
  return {
    rawEventId: row.id,
    observedAt: row.observedAt,
    dayKey,
    waistCm: record.waistCircumferenceCm,
    sourceId: row.sourceId,
    protocolId: readProtocolId(record),
  };
}

/** Ascending by observedAt — chart series. Preserves same-day distinct timestamps. */
export function sortWaistPointsAscending(
  points: readonly WaistHistoryPoint[],
): WaistHistoryPoint[] {
  return [...points].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
}

/** Descending by observedAt — history list helpers. */
export function sortWaistPointsDescending(
  points: readonly WaistHistoryPoint[],
): WaistHistoryPoint[] {
  return [...points].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

export function buildWaistHistoryStats(
  points: readonly WaistHistoryPoint[],
): WaistHistoryStats {
  if (points.length === 0) {
    return { low: null, high: null, change: null };
  }
  const sorted = sortWaistPointsAscending(points);
  const values = sorted.map((p) => p.waistCm);
  return {
    low: Math.min(...values),
    high: Math.max(...values),
    change: values.length >= 2 ? values[values.length - 1]! - values[0]! : null,
  };
}

/**
 * Presentation-only latest waist: the point with maximum `observedAt`.
 * Not a clinical "best" or "current" selector — name is intentional.
 */
export function selectLatestWaistForPresentation(
  points: readonly WaistHistoryPoint[],
): WaistHistoryPoint | null {
  if (points.length === 0) return null;
  let best = points[0]!;
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]!;
    if (p.observedAt > best.observedAt) best = p;
  }
  return best;
}

export function buildWaistHistoryPointsFromRows(
  rows: readonly WaistHistoryRawRow[],
  fallbackTimeZone: string,
): WaistHistoryPoint[] {
  const out: WaistHistoryPoint[] = [];
  for (const row of rows) {
    const point = extractWaistHistoryPoint(row, fallbackTimeZone);
    if (point) out.push(point);
  }
  return sortWaistPointsAscending(out);
}
