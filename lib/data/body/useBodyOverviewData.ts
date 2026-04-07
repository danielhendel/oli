import { useMemo } from "react";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { useWeightSeries } from "@/lib/data/useWeightSeries";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useBodyOverviewPeek } from "@/lib/data/body/useBodyOverviewPeek";
import { useBodyOverviewSnapshotDayPeek } from "@/lib/data/body/useBodyOverviewSnapshotDayPeek";
import { useAppleHealthBodySync } from "@/lib/data/body/useAppleHealthBodySync";
import { ytdBoundsForAnchorDay } from "@/lib/data/body/bodyHistoryRange";
import { useBodyMetricTrends, type BodyMetricTrendsState } from "@/lib/data/body/useBodyMetricTrends";
import { filterToAppleHealthBodyReadSources } from "@/lib/data/body/sourceFiltering";
import {
  bodyMarkerDays,
  bodyMetricsForSnapshotDay,
  EMPTY_BODY_SNAPSHOT_PEEK_ROWS,
  latestBodySnapshotDay,
} from "@/lib/data/body/bodySnapshot";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import type { BodyDayMarker } from "@/lib/ui/body/BodyWeeklyStrip";
import type { WeightPoint } from "@/lib/data/useWeightSeries";

export type BodyRecentItem = {
  day: string;
  latest: WeightPoint;
};

/**
 * YTD band: low/high = min/max weight (kg) in the YTD query window; current = latest sample in-window by `observedAt`.
 * Not an interpretation / quality bar — pure placement on the min–max weight span.
 */
export type BodyTrendsV1WeightYtd = {
  trendYear: number;
  windowLabel: string;
  trendsStatus: "partial" | "ready" | "error";
  /** `buildStats` change (last − first by `observedAt`) in YTD window; kg. */
  changeKg: number | null;
  bandLowKg: number | null;
  bandHighKg: number | null;
  bandCurrentKg: number | null;
  sampleCount: number | null;
  errorMessage?: string;
  requestId?: string | null;
};

export type BodyTrendsV1Weight = {
  /** Overview snapshot weight + weekly delta from `useWeightSeries` 5Y view model (`weeklyDeltaKg`). */
  latest: {
    currentKg: number | null;
    seriesStatus: "partial" | "ready" | "error";
    weeklyDeltaKg: number | null;
  };
  ytd: BodyTrendsV1WeightYtd;
};

/** View-model for {@link BodyTrendsCard} (weight-only). */
export type BodyTrendsV1 = BodyTrendsV1Weight;

function bodyTrendsYtdFromState(anchorDayKey: string, state: BodyMetricTrendsState): BodyTrendsV1WeightYtd {
  const win = ytdBoundsForAnchorDay(anchorDayKey);
  const windowLabel = `${win.start} → ${win.end}`;
  const trendYear = Number(anchorDayKey.slice(0, 4));
  const safeYear = Number.isFinite(trendYear) && trendYear >= 1 ? trendYear : new Date().getFullYear();

  if (state.status === "partial") {
    return {
      trendYear: safeYear,
      windowLabel,
      trendsStatus: "partial",
      changeKg: null,
      bandLowKg: null,
      bandHighKg: null,
      bandCurrentKg: null,
      sampleCount: null,
    };
  }
  if (state.status === "error") {
    return {
      trendYear: safeYear,
      windowLabel,
      trendsStatus: "error",
      changeKg: null,
      bandLowKg: null,
      bandHighKg: null,
      bandCurrentKg: null,
      sampleCount: null,
      errorMessage: state.error,
      requestId: state.requestId,
    };
  }
  const pts = state.data.byMetric.weight;
  const sorted = [...pts].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const bandCurrentKg = sorted.length ? sorted[sorted.length - 1]!.weightKg : null;
  const w = state.data.statsByMetric.weight;
  return {
    trendYear: safeYear,
    windowLabel,
    trendsStatus: "ready",
    changeKg: w.change,
    bandLowKg: w.low,
    bandHighKg: w.high,
    bandCurrentKg,
    sampleCount: pts.length,
  };
}

/**
 * Main Body overview: weight series (5Y) + one-page peek + daily facts for snapshot day +
 * `useBodyMetricTrends("YTD", "weight", { anchorDayKey })` for annual summary +
 * `weeklyDeltaKg` from `useWeightSeries` for “this week”.
 */
export function useBodyOverviewData() {
  const series = useWeightSeries("5Y");
  const peek = useBodyOverviewPeek();
  const today = getTodayDayKeyLocal();
  const weekDaysAnchor = getWeekDaysForAnchor(today);
  const tz = getDeviceTimeZone();

  const filteredWeightPoints = useMemo(() => {
    if (series.status !== "ready") return [] as WeightPoint[];
    return filterToAppleHealthBodyReadSources(series.data.points);
  }, [series]);

  const peekRows = peek.status === "ready" ? peek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS;

  const overviewDay = useMemo(() => {
    if (filteredWeightPoints.length === 0 && peekRows.length === 0) return null;
    return latestBodySnapshotDay(filteredWeightPoints, peekRows, tz);
  }, [filteredWeightPoints, peekRows, tz]);

  const factsDay = overviewDay ?? today;
  const dayFacts = useDailyFacts(factsDay);
  const snapshotDayPeek = useBodyOverviewSnapshotDayPeek(overviewDay);
  const trendsWeightYtd = useBodyMetricTrends("YTD", "weight", { anchorDayKey: factsDay });

  const { isBodySyncing, syncAppleHealthBodyNow, hasSuccessfulBodySync } = useAppleHealthBodySync(() => {
    void series.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
    void peek.refetch({ cacheBust: `appleHealthPeek:${Date.now()}` });
    void snapshotDayPeek.refetch({ cacheBust: `appleHealthSnapshotPeek:${Date.now()}` });
    void dayFacts.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
    void trendsWeightYtd.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
  });

  const derived = useMemo(() => {
    const markSet = bodyMarkerDays(
      filteredWeightPoints,
      peek.status === "ready" ? peek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS,
      tz,
    );

    if (series.status !== "ready") {
      const week: CalendarDay<BodyDayMarker>[] = weekDaysAnchor.map((day) => ({
        day,
        meta: { hasMeasurement: markSet.has(day) },
      }));
      return {
        weekDays: week,
        markedDays: markSet,
        byDay: new Map<string, WeightPoint[]>(),
        recent: [] as BodyRecentItem[],
        stats: { changeKg: null as number | null, avgKg: null as number | null, highKg: null as number | null, lowKg: null as number | null },
      };
    }

    const byDay = new Map<string, WeightPoint[]>();
    for (const point of filteredWeightPoints) {
      const current = byDay.get(point.dayKey) ?? [];
      current.push(point);
      byDay.set(point.dayKey, current);
    }
    for (const arr of byDay.values()) {
      arr.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    }

    const week: CalendarDay<BodyDayMarker>[] = weekDaysAnchor.map((day) => ({
      day,
      meta: { hasMeasurement: markSet.has(day) },
    }));

    const sortedDays = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));
    const recent: BodyRecentItem[] = sortedDays.slice(0, 7).map((day) => ({
      day,
      latest: byDay.get(day)![0]!,
    }));

    const weights = filteredWeightPoints.map((p) => p.weightKg);
    const avgKg = weights.length ? weights.reduce((s, n) => s + n, 0) / weights.length : null;
    const highKg = weights.length ? Math.max(...weights) : null;
    const lowKg = weights.length ? Math.min(...weights) : null;
    const oldest = [...filteredWeightPoints].sort((a, b) => a.dayKey.localeCompare(b.dayKey))[0];
    const latest = filteredWeightPoints.length
      ? [...filteredWeightPoints].sort((a, b) => a.observedAt.localeCompare(b.observedAt))[filteredWeightPoints.length - 1]
      : null;
    const changeKg = latest && oldest ? latest.weightKg - oldest.weightKg : null;

    return {
      weekDays: week,
      markedDays: markSet,
      byDay,
      recent,
      stats: { changeKg, avgKg, highKg, lowKg },
    };
  }, [series.status, filteredWeightPoints, weekDaysAnchor, peek, tz]);

  const overview = useMemo(() => {
    if (!overviewDay) {
      return {
        overviewDay: null as string | null,
        weightKg: null as number | null,
        bodyFatPercent: null as number | null,
        bmi: null as number | null,
        leanBodyMassKg: null as number | null,
        restingMetabolicRateKcal: null as number | null,
        hasAnyMetric: false,
      };
    }

    const snapshotPeekRows =
      snapshotDayPeek.status === "ready" ? snapshotDayPeek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS;
    const { weightKgFromSeries, weightKgFromPeek, peekComp } = bodyMetricsForSnapshotDay(
      overviewDay,
      derived.byDay,
      peek.status === "ready" ? peek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS,
      snapshotPeekRows,
      tz,
    );
    const weightKg = weightKgFromSeries ?? weightKgFromPeek;

    const body = dayFacts.status === "ready" && dayFacts.data.body ? dayFacts.data.body : null;

    const bodyFatPercent = body?.bodyFatPercent ?? peekComp.bodyFatPercent;
    const bmi = body?.bmi ?? peekComp.bmi;
    const leanBodyMassKg = body?.leanBodyMassKg ?? peekComp.leanBodyMassKg;
    const restingMetabolicRateKcal = body?.restingMetabolicRateKcal ?? peekComp.restingMetabolicRateKcal;

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
    };
  }, [overviewDay, derived.byDay, peek, snapshotDayPeek, dayFacts, tz]);

  const trendsV1 = useMemo((): BodyTrendsV1 => {
    return {
      latest: {
        currentKg: overview.weightKg,
        seriesStatus: series.status,
        weeklyDeltaKg: series.status === "ready" ? series.data.weeklyDeltaKg : null,
      },
      ytd: bodyTrendsYtdFromState(factsDay, trendsWeightYtd),
    };
  }, [overview.weightKg, series, factsDay, trendsWeightYtd]);

  return {
    today,
    series,
    trendsWeightYtd,
    peek,
    snapshotDayPeek,
    dayFacts,
    isBodySyncing,
    syncAppleHealthBodyNow,
    hasSuccessfulBodySync,
    ...derived,
    overview,
    trendsV1,
  };
}
