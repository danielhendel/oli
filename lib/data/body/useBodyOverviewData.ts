import { useMemo } from "react";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { useWeightSeries } from "@/lib/data/useWeightSeries";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useBodyOverviewPeek } from "@/lib/data/body/useBodyOverviewPeek";
import { useBodyOverviewSnapshotDayPeek } from "@/lib/data/body/useBodyOverviewSnapshotDayPeek";
import { useAppleHealthBodySync } from "@/lib/data/body/useAppleHealthBodySync";
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
 * Main Body overview: weight series (5Y) + one-page peek + daily facts for snapshot day.
 * Does not load full multi-metric trends (detail screens only).
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

  const { isBodySyncing, syncAppleHealthBodyNow, hasSuccessfulBodySync } = useAppleHealthBodySync(() => {
    void series.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
    void peek.refetch({ cacheBust: `appleHealthPeek:${Date.now()}` });
    void snapshotDayPeek.refetch({ cacheBust: `appleHealthSnapshotPeek:${Date.now()}` });
    void dayFacts.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
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

  return {
    today,
    series,
    peek,
    snapshotDayPeek,
    dayFacts,
    isBodySyncing,
    syncAppleHealthBodyNow,
    hasSuccessfulBodySync,
    ...derived,
    overview,
  };
}
