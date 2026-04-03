import { useMemo } from "react";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { useWeightSeries, type WeightPoint, type WeightRangeKey } from "@/lib/data/useWeightSeries";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import type { BodyDayMarker } from "@/lib/ui/body/BodyWeeklyStrip";
import { useAppleHealthBodySync } from "@/lib/data/body/useAppleHealthBodySync";
import { useBodyMetricTrends } from "@/lib/data/body/useBodyMetricTrends";
import { useBodyOverviewPeek } from "@/lib/data/body/useBodyOverviewPeek";
import { filterToAppleHealthBodyReadSources } from "@/lib/data/body/sourceFiltering";
import { bodyMarkerDays, EMPTY_BODY_SNAPSHOT_PEEK_ROWS } from "@/lib/data/body/bodySnapshot";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";

export type BodyRecentItem = {
  day: string;
  latest: WeightPoint;
};

/**
 * @param chartRange — chart selector on Body overview; drives trend fetch window (maps "All" → 5Y server query).
 * Series uses a fixed 5Y window so Recent/strip stay aligned with Apple Health backfill without unbounded scans.
 */
export function useBodyCompositionData(selectedDay: string, chartRange: WeightRangeKey) {
  const series = useWeightSeries("5Y");
  const peek = useBodyOverviewPeek();
  const trends = useBodyMetricTrends(chartRange);
  const dayFacts = useDailyFacts(selectedDay);
  const tz = getDeviceTimeZone();
  const { isBodySyncing, syncAppleHealthBodyNow, hasSuccessfulBodySync } = useAppleHealthBodySync(() => {
    series.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
    void peek.refetch({ cacheBust: `appleHealthPeek:${Date.now()}` });
    trends.refetch({ cacheBust: `appleHealthTrends:${Date.now()}` });
    dayFacts.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
  });
  const today = getTodayDayKeyLocal();
  const weekDays = getWeekDaysForAnchor(today);

  const derived = useMemo(() => {
    const filteredPoints =
      series.status === "ready" ? filterToAppleHealthBodyReadSources(series.data.points) : [];
    const peekRows = peek.status === "ready" ? peek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS;
    const markedDays = bodyMarkerDays(filteredPoints, peekRows, tz);

    if (series.status !== "ready") {
      const emptyDays: CalendarDay<BodyDayMarker>[] = weekDays.map((day) => ({
        day,
        meta: { hasMeasurement: markedDays.has(day) },
      }));
      return {
        weekDays: emptyDays,
        markedDays,
        byDay: new Map<string, WeightPoint[]>(),
        recent: [] as BodyRecentItem[],
        stats: { changeKg: null as number | null, avgKg: null as number | null, highKg: null as number | null, lowKg: null as number | null },
      };
    }

    const byDay = new Map<string, WeightPoint[]>();
    for (const point of filteredPoints) {
      const current = byDay.get(point.dayKey) ?? [];
      current.push(point);
      byDay.set(point.dayKey, current);
    }
    for (const arr of byDay.values()) {
      arr.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    }

    const week: CalendarDay<BodyDayMarker>[] = weekDays.map((day) => ({
      day,
      meta: { hasMeasurement: markedDays.has(day) },
    }));

    const sortedDays = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));
    const recent: BodyRecentItem[] = sortedDays.slice(0, 7).map((day) => ({
      day,
      latest: byDay.get(day)![0]!,
    }));

    const weights = filteredPoints.map((p) => p.weightKg);
    const avgKg = weights.length ? weights.reduce((s, n) => s + n, 0) / weights.length : null;
    const highKg = weights.length ? Math.max(...weights) : null;
    const lowKg = weights.length ? Math.min(...weights) : null;
    const oldest = [...filteredPoints].sort((a, b) => a.dayKey.localeCompare(b.dayKey))[0];
    const latest = filteredPoints.length
      ? [...filteredPoints].sort((a, b) => a.observedAt.localeCompare(b.observedAt))[filteredPoints.length - 1]
      : null;
    const changeKg = latest && oldest ? latest.weightKg - oldest.weightKg : null;

    return {
      weekDays: week,
      markedDays,
      byDay,
      recent,
      stats: { changeKg, avgKg, highKg, lowKg },
    };
  }, [series, weekDays, peek, tz]);

  return { today, series, trends, dayFacts, isBodySyncing, syncAppleHealthBodyNow, hasSuccessfulBodySync, ...derived };
}

