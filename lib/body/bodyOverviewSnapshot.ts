/**
 * Shared Body overview snapshot — single source of truth for Dash + Body Composition page.
 *
 * Merges weight series, peek rows, snapshot-day peek, and dailyFacts into one typed slice.
 * Pure functions only (no React, no network).
 */
import type { BodyWeightSample } from "@/lib/data/body/bodyWeightDailySeries";
import { latestWeightByDay } from "@/lib/data/body/bodyWeightDailySeries";
import {
  bodyMetricsForSnapshotDay,
  latestBodySnapshotDay,
  latestObservedAtForSnapshotDay,
  type BodySnapshotPeekRow,
} from "@/lib/data/body/bodySnapshot";
import { deriveWeightPointDayKey } from "@/lib/data/body/weightDayKey";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import type { DayKey } from "@/lib/ui/calendar/types";

export type BodyOverviewDailyFactsBody = {
  weightKg?: number;
  bodyFatPercent?: number;
  bmi?: number;
  leanBodyMassKg?: number;
  restingMetabolicRateKcal?: number;
};

/** Map dailyFacts.body to a snapshot-safe slice (drops explicit undefined fields). */
export function dailyFactsBodyForSnapshot(
  body:
    | {
        weightKg?: number | undefined;
        bodyFatPercent?: number | undefined;
        bmi?: number | undefined;
        leanBodyMassKg?: number | undefined;
        restingMetabolicRateKcal?: number | undefined;
      }
    | null
    | undefined,
): BodyOverviewDailyFactsBody | null {
  if (!body) return null;
  const out: BodyOverviewDailyFactsBody = {};
  if (typeof body.weightKg === "number") out.weightKg = body.weightKg;
  if (typeof body.bodyFatPercent === "number") out.bodyFatPercent = body.bodyFatPercent;
  if (typeof body.bmi === "number") out.bmi = body.bmi;
  if (typeof body.leanBodyMassKg === "number") out.leanBodyMassKg = body.leanBodyMassKg;
  if (typeof body.restingMetabolicRateKcal === "number") {
    out.restingMetabolicRateKcal = body.restingMetabolicRateKcal;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type BodyOverviewSnapshot = {
  overviewDay: DayKey | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  bmi: number | null;
  leanBodyMassKg: number | null;
  restingMetabolicRateKcal: number | null;
  hasAnyMetric: boolean;
  latestObservedAtIso: string | null;
};

export type BuildBodyOverviewSnapshotInput = {
  todayDayKey: DayKey;
  weightPoints: readonly Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg">[];
  peekRows: readonly BodySnapshotPeekRow[];
  snapshotPeekRows: readonly BodySnapshotPeekRow[];
  dailyFactsBody: BodyOverviewDailyFactsBody | null;
  byDay: Map<string, WeightPoint[]>;
  tz: string;
};

/** Extract Apple Health weight points from peek rows (fast path before 5Y series hydrates). */
export function weightPointsFromPeekRows(
  rows: readonly BodySnapshotPeekRow[],
  tz: string,
): WeightPoint[] {
  const out: WeightPoint[] = [];
  for (const r of rows) {
    if (r.kind !== "weight") continue;
    const payload = r.payload as
      | { weightKg?: number; time?: string; timezone?: string }
      | undefined;
    const kg =
      typeof payload?.weightKg === "number" && payload.weightKg > 0 ? payload.weightKg : null;
    if (kg == null) continue;
    const sourceId =
      typeof (r as BodySnapshotPeekRow & { sourceId?: string }).sourceId === "string"
        ? (r as BodySnapshotPeekRow & { sourceId: string }).sourceId
        : "apple_health";
    out.push({
      dayKey: deriveWeightPointDayKey(payload ?? {}, r.observedAt, tz),
      observedAt: r.observedAt,
      weightKg: kg,
      sourceId,
    });
  }
  return out;
}

/** Build per-day weight map with latest-by-observedAt ordering (desc) within each day. */
export function buildWeightByDayMap(
  points: readonly Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg" | "sourceId">[],
): Map<string, WeightPoint[]> {
  const byDay = new Map<string, WeightPoint[]>();
  for (const point of points) {
    const current = byDay.get(point.dayKey) ?? [];
    current.push(point as WeightPoint);
    byDay.set(point.dayKey, current);
  }
  for (const arr of byDay.values()) {
    arr.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  }
  return byDay;
}

/** Flatten weight points to {@link BodyWeightSample} for trend cards (one value per day). */
export function bodyWeightSamplesFromPoints(
  points: readonly Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg">[],
): BodyWeightSample[] {
  const byDay = latestWeightByDay(
    points.map((p) => ({
      dayKey: p.dayKey,
      observedAt: p.observedAt,
      weightKg: p.weightKg,
    })),
  );
  return Array.from(byDay.entries())
    .map(([dayKey, weightKg]) => {
      const match = [...points]
        .filter((p) => p.dayKey === dayKey)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
      return {
        dayKey,
        observedAt: match?.observedAt ?? `${dayKey}T12:00:00.000Z`,
        weightKg,
      };
    })
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/**
 * Latest weight point by `observedAt` (deterministic). Same-day ties resolve to latest timestamp.
 */
export function latestWeightPoint(
  points: readonly Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg">[],
): Pick<WeightPoint, "dayKey" | "observedAt" | "weightKg"> | null {
  if (points.length === 0) return null;
  return [...points].sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]!;
}

export function buildBodyOverviewSnapshot(input: BuildBodyOverviewSnapshotInput): BodyOverviewSnapshot {
  const { weightPoints, peekRows, snapshotPeekRows, dailyFactsBody, byDay, tz } = input;

  const overviewDay =
    weightPoints.length === 0 && peekRows.length === 0
      ? null
      : latestBodySnapshotDay(weightPoints, peekRows, tz);

  if (overviewDay == null) {
    return {
      overviewDay: null,
      weightKg: null,
      bodyFatPercent: null,
      bmi: null,
      leanBodyMassKg: null,
      restingMetabolicRateKcal: null,
      hasAnyMetric: false,
      latestObservedAtIso: null,
    };
  }

  const latestObservedAtIso = latestObservedAtForSnapshotDay(
    overviewDay,
    byDay,
    peekRows,
    snapshotPeekRows,
    tz,
  );
  const { weightKgFromSeries, weightKgFromPeek, peekComp } = bodyMetricsForSnapshotDay(
    overviewDay,
    byDay,
    peekRows,
    snapshotPeekRows,
    tz,
  );
  const weightKg = weightKgFromSeries ?? weightKgFromPeek;

  const bodyFatPercent = dailyFactsBody?.bodyFatPercent ?? peekComp.bodyFatPercent;
  const bmi = dailyFactsBody?.bmi ?? peekComp.bmi;
  const leanBodyMassKg = dailyFactsBody?.leanBodyMassKg ?? peekComp.leanBodyMassKg;
  const restingMetabolicRateKcal =
    dailyFactsBody?.restingMetabolicRateKcal ?? peekComp.restingMetabolicRateKcal;

  const hasAnyMetric =
    weightKg != null ||
    bodyFatPercent != null ||
    bmi != null ||
    leanBodyMassKg != null ||
    restingMetabolicRateKcal != null;

  return {
    overviewDay,
    weightKg,
    bodyFatPercent,
    bmi,
    leanBodyMassKg,
    restingMetabolicRateKcal,
    hasAnyMetric,
    latestObservedAtIso,
  };
}
