import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";
import type { WeightPoint } from "@/lib/data/useWeightSeries"; // type-only: no runtime cycle

/**
 * Minimal peek row shape for Body snapshot selection (Apple Health–filtered lists).
 */
export type BodySnapshotPeekRow = {
  /** Firestore raw id when present (preferred for dedupe); omitted in some unit tests. */
  id?: string;
  kind: string;
  observedAt: string;
  payload?: unknown;
};

function peekRowDedupeKey(r: BodySnapshotPeekRow): string {
  return typeof r.id === "string" && r.id.length > 0 ? r.id : `${r.kind}:${r.observedAt}`;
}

/** Stable empty list — avoids unstable `[]` in hook dependency comparisons. */
export const EMPTY_BODY_SNAPSHOT_PEEK_ROWS: readonly BodySnapshotPeekRow[] = Object.freeze([]);

export type BodySnapshotComp = {
  bodyFatPercent: number | null;
  bmi: number | null;
  leanBodyMassKg: number | null;
  restingMetabolicRateKcal: number | null;
};

function emptyComp(): BodySnapshotComp {
  return { bodyFatPercent: null, bmi: null, leanBodyMassKg: null, restingMetabolicRateKcal: null };
}

function parsePayloadToComp(payload: unknown): Partial<BodySnapshotComp> {
  const p = payload as {
    bodyFatPercent?: number;
    bmi?: number;
    leanBodyMassKg?: number;
    restingMetabolicRateKcal?: number;
  };
  const out: Partial<BodySnapshotComp> = {};
  if (typeof p.bodyFatPercent === "number" && p.bodyFatPercent >= 0 && p.bodyFatPercent <= 100)
    out.bodyFatPercent = p.bodyFatPercent;
  if (typeof p.bmi === "number" && p.bmi > 0 && p.bmi < 100) out.bmi = p.bmi;
  if (typeof p.leanBodyMassKg === "number" && p.leanBodyMassKg > 0) out.leanBodyMassKg = p.leanBodyMassKg;
  if (typeof p.restingMetabolicRateKcal === "number" && p.restingMetabolicRateKcal > 0)
    out.restingMetabolicRateKcal = p.restingMetabolicRateKcal;
  return out;
}

export function hasCompositionMetricInPayload(payload: unknown): boolean {
  const c = parsePayloadToComp(payload);
  return (
    c.bodyFatPercent != null ||
    c.bmi != null ||
    c.leanBodyMassKg != null ||
    c.restingMetabolicRateKcal != null
  );
}

/**
 * Product rule: preferred snapshot day = calendar day of the latest weight sample (series + peek).
 * If no weight exists anywhere, fall back to latest day with any body-composition metric (peek).
 */
export function latestBodySnapshotDay(
  weightPoints: readonly Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg">[],
  peekRows: readonly BodySnapshotPeekRow[],
  tz: string,
): string | null {
  let bestWeight: { observedAt: string; dayKey: string } | null = null;
  for (const p of weightPoints) {
    if (!bestWeight || p.observedAt.localeCompare(bestWeight.observedAt) > 0) {
      bestWeight = { observedAt: p.observedAt, dayKey: p.dayKey };
    }
  }
  for (const r of peekRows) {
    if (r.kind !== "weight") continue;
    const payload = r.payload as { weightKg?: number; time?: string; timezone?: string } | undefined;
    const kg = typeof payload?.weightKg === "number" && payload.weightKg > 0 ? payload.weightKg : null;
    if (kg == null) continue;
    const dk = deriveWeightPointDayKey(payload ?? {}, r.observedAt, tz);
    if (!bestWeight || r.observedAt.localeCompare(bestWeight.observedAt) > 0) {
      bestWeight = { observedAt: r.observedAt, dayKey: dk };
    }
  }
  if (bestWeight) return bestWeight.dayKey;

  let bestComp: { observedAt: string; dayKey: string } | null = null;
  for (const r of peekRows) {
    if (r.kind !== "body_composition") continue;
    if (!hasCompositionMetricInPayload(r.payload)) continue;
    const payload = (r.payload ?? {}) as { time?: string; timezone?: string };
    const dk = deriveWeightPointDayKey(payload, r.observedAt, tz);
    if (!bestComp || r.observedAt.localeCompare(bestComp.observedAt) > 0) {
      bestComp = { observedAt: r.observedAt, dayKey: dk };
    }
  }
  return bestComp?.dayKey ?? null;
}

/**
 * Weekly/monthly markers: days with at least one weight log when any weight exists (series + peek).
 * If there is no weight anywhere, mark days that have a body-composition sample (peek only).
 */
export function bodyMarkerDays(
  weightPoints: readonly Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg">[],
  peekRows: readonly BodySnapshotPeekRow[],
  tz: string,
): Set<string> {
  const weightDays = new Set<string>();
  for (const p of weightPoints) {
    weightDays.add(p.dayKey);
  }
  for (const r of peekRows) {
    if (r.kind !== "weight") continue;
    const payload = r.payload as { weightKg?: number; time?: string; timezone?: string } | undefined;
    const kg = typeof payload?.weightKg === "number" && payload.weightKg > 0 ? payload.weightKg : null;
    if (kg == null) continue;
    weightDays.add(deriveWeightPointDayKey(payload ?? {}, r.observedAt, tz));
  }

  if (weightDays.size > 0) return weightDays;

  const compDays = new Set<string>();
  for (const r of peekRows) {
    if (r.kind !== "body_composition" || !hasCompositionMetricInPayload(r.payload)) continue;
    const payload = (r.payload ?? {}) as { time?: string; timezone?: string };
    compDays.add(deriveWeightPointDayKey(payload, r.observedAt, tz));
  }
  return compDays;
}

/**
 * Same-calendar-day merge for Overview: Apple Health stores `bodyFatPercent` on `weight` rows and
 * BMI / lean / RMR (and optional body fat) on separate `body_composition` rows — all must merge by
 * normalized local day, not exact timestamp match.
 */
export function compositionMetricsFromPeekRowsForSnapshotDay(
  rows: readonly BodySnapshotPeekRow[],
  snapshotDay: string,
  tz: string,
): BodySnapshotComp {
  const acc = emptyComp();
  const sorted = rows
    .filter((r) => r.kind === "weight" || r.kind === "body_composition")
    .filter(
      (r) =>
        deriveWeightPointDayKey(
          (r.payload as { time?: string; timezone?: string }) ?? {},
          r.observedAt,
          tz,
        ) === snapshotDay,
    )
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  for (const r of sorted) {
    const p = parsePayloadToComp(r.payload);
    if (p.bodyFatPercent != null) acc.bodyFatPercent = p.bodyFatPercent;
    if (p.bmi != null) acc.bmi = p.bmi;
    if (p.leanBodyMassKg != null) acc.leanBodyMassKg = p.leanBodyMassKg;
    if (p.restingMetabolicRateKcal != null) acc.restingMetabolicRateKcal = p.restingMetabolicRateKcal;
  }
  return acc;
}

/** Prefer `primary` rows when both lists contain the same raw id (snapshot-day fetch wins). */
export function dedupePeekRowsById(
  primary: readonly BodySnapshotPeekRow[],
  secondary: readonly BodySnapshotPeekRow[],
): BodySnapshotPeekRow[] {
  const m = new Map<string, BodySnapshotPeekRow>();
  for (const r of secondary) {
    m.set(peekRowDedupeKey(r), r);
  }
  for (const r of primary) {
    m.set(peekRowDedupeKey(r), r);
  }
  return Array.from(m.values());
}

export function latestWeightKgFromPeekForDay(
  rows: readonly BodySnapshotPeekRow[],
  snapshotDay: string,
  tz: string,
): number | null {
  let best: { t: string; kg: number } | null = null;
  for (const r of rows) {
    if (r.kind !== "weight") continue;
    const payload = r.payload as { weightKg?: number; time?: string; timezone?: string } | undefined;
    const kg = typeof payload?.weightKg === "number" && payload.weightKg > 0 ? payload.weightKg : null;
    if (kg == null) continue;
    const dk = deriveWeightPointDayKey(payload ?? {}, r.observedAt, tz);
    if (dk !== snapshotDay) continue;
    if (!best || r.observedAt.localeCompare(best.t) > 0) best = { t: r.observedAt, kg };
  }
  return best?.kg ?? null;
}

export function bodyMetricsForSnapshotDay(
  snapshotDay: string,
  byDay: Map<string, WeightPoint[]>,
  globalPeekRows: readonly BodySnapshotPeekRow[],
  snapshotDayPeekRows: readonly BodySnapshotPeekRow[],
  tz: string,
): {
  weightKgFromSeries: number | null;
  weightKgFromPeek: number | null;
  peekComp: BodySnapshotComp;
} {
  const mergedPeek = dedupePeekRowsById(snapshotDayPeekRows, globalPeekRows);
  const dayPoints = byDay.get(snapshotDay) ?? [];
  const weightKgFromSeries = dayPoints[0]?.weightKg ?? null;
  const weightKgFromPeek = latestWeightKgFromPeekForDay(mergedPeek, snapshotDay, tz);
  const peekComp = compositionMetricsFromPeekRowsForSnapshotDay(mergedPeek, snapshotDay, tz);
  return { weightKgFromSeries, weightKgFromPeek, peekComp };
}

/**
 * Latest ISO timestamp among weight-series points and peek rows contributing to `snapshotDay`
 * (same merge rule as {@link bodyMetricsForSnapshotDay}).
 */
export function latestObservedAtForSnapshotDay(
  snapshotDay: string,
  byDay: Map<string, WeightPoint[]>,
  globalPeekRows: readonly BodySnapshotPeekRow[],
  snapshotDayPeekRows: readonly BodySnapshotPeekRow[],
  tz: string,
): string | null {
  const mergedPeek = dedupePeekRowsById(snapshotDayPeekRows, globalPeekRows);
  let best: string | null = null;
  const bump = (iso: string | undefined | null) => {
    if (iso == null || typeof iso !== "string" || iso.length === 0) return;
    if (!best || iso.localeCompare(best) > 0) best = iso;
  };
  for (const p of byDay.get(snapshotDay) ?? []) {
    bump(p.observedAt);
  }
  for (const r of mergedPeek) {
    if (r.kind !== "weight" && r.kind !== "body_composition") continue;
    const payload = (r.payload ?? {}) as { time?: string; timezone?: string };
    const dk = deriveWeightPointDayKey(payload, r.observedAt, tz);
    if (dk === snapshotDay) bump(r.observedAt);
  }
  return best;
}
