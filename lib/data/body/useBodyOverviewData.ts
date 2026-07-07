import { useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getTodayDayKeyLocal, getWeekDaysForAnchor } from "@/lib/ui/calendar/dateUtils";
import type { CalendarDay } from "@/lib/ui/calendar/types";
import { useWeightSeries } from "@/lib/data/useWeightSeries";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useBodyOverviewPeek } from "@/lib/data/body/useBodyOverviewPeek";
import { useBodyOverviewSnapshotDayPeek } from "@/lib/data/body/useBodyOverviewSnapshotDayPeek";
import { useAppleHealthBodySync } from "@/lib/data/body/useAppleHealthBodySync";
import { rollingLookbackWindowForAnchorDay } from "@/lib/data/body/bodyHistoryRange";
import { filterToAppleHealthBodyReadSources } from "@/lib/data/body/sourceFiltering";
import { bodyMarkerDays, EMPTY_BODY_SNAPSHOT_PEEK_ROWS, latestBodySnapshotDay } from "@/lib/data/body/bodySnapshot";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import type { BodyDayMarker } from "@/lib/ui/body/BodyWeeklyStrip";
import type { WeightPoint } from "@/lib/data/useWeightSeries";
import {
  buildWeightBaselineCardModel,
  type WeightBaselineCardModel,
} from "@/lib/data/body/weightBaselineCardModel";
import {
  bodyWeightSamplesFromPoints,
  buildBodyOverviewSnapshot,
  buildWeightByDayMap,
  dailyFactsBodyForSnapshot,
  weightPointsFromPeekRows,
} from "@/lib/body/bodyOverviewSnapshot";
import { scheduleDailyFactsInvalidationAfterIngest } from "@/lib/data/dailyFactsSessionCache";

export type BodyRecentItem = {
  day: string;
  latest: WeightPoint;
};

/** Weight Baseline card readiness uses canonical status vocabulary. */
export type BodyWeightBaselineOverview =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "ready"; model: WeightBaselineCardModel };

/**
 * Main Body overview: weight series (5Y) + one-page peek + daily facts for snapshot day.
 * Weight Baseline uses the same Apple Health–filtered series as the overview (no extra trend queries).
 */
export function useBodyOverviewData() {
  const { user } = useAuth();
  const series = useWeightSeries("5Y");
  const peek = useBodyOverviewPeek();
  const today = getTodayDayKeyLocal();
  const weekDaysAnchor = useMemo(() => getWeekDaysForAnchor(today), [today]);
  const tz = getDeviceTimeZone();

  const peekRows = peek.status === "ready" ? peek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS;

  const peekWeightPoints = useMemo(
    () => weightPointsFromPeekRows(peekRows, tz),
    [peekRows, tz],
  );

  const seriesWeightPoints = useMemo(() => {
    if (series.status !== "ready") return [] as WeightPoint[];
    return filterToAppleHealthBodyReadSources(series.data.points);
  }, [series]);

  /** Prefer full series when ready; hydrate from peek while 5Y pagination is in flight. */
  const filteredWeightPoints = useMemo(() => {
    if (series.status === "ready") return seriesWeightPoints;
    if (peek.status === "ready") return filterToAppleHealthBodyReadSources(peekWeightPoints);
    return [] as WeightPoint[];
  }, [series.status, seriesWeightPoints, peek.status, peekWeightPoints]);

  const overviewDay = useMemo(() => {
    if (filteredWeightPoints.length === 0 && peekRows.length === 0) return null;
    return latestBodySnapshotDay(filteredWeightPoints, peekRows, tz);
  }, [filteredWeightPoints, peekRows, tz]);

  const factsDay = overviewDay ?? today;
  const dayFacts = useDailyFacts(factsDay);
  const snapshotDayPeek = useBodyOverviewSnapshotDayPeek(overviewDay);

  const seriesRef = useRef(series);
  seriesRef.current = series;
  const peekRef = useRef(peek);
  peekRef.current = peek;
  const snapshotDayPeekRef = useRef(snapshotDayPeek);
  snapshotDayPeekRef.current = snapshotDayPeek;
  const dayFactsRef = useRef(dayFacts);
  dayFactsRef.current = dayFacts;
  const factsDayRef = useRef(factsDay);
  factsDayRef.current = factsDay;

  const onAppleHealthBodySynced = useCallback(() => {
    void seriesRef.current.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
    void peekRef.current.refetch({ cacheBust: `appleHealthPeek:${Date.now()}` });
    void snapshotDayPeekRef.current.refetch({
      cacheBust: `appleHealthSnapshotPeek:${Date.now()}`,
    });
    void dayFactsRef.current.refetch({ cacheBust: `appleHealthBody:${Date.now()}` });
    const uid = user?.uid;
    const factsDayNow = factsDayRef.current;
    if (uid) {
      scheduleDailyFactsInvalidationAfterIngest({ userUid: uid, day: today });
      if (factsDayNow !== today) {
        scheduleDailyFactsInvalidationAfterIngest({ userUid: uid, day: factsDayNow });
      }
    }
  }, [user?.uid, today]);

  const { isBodySyncing, syncAppleHealthBodyNow, hasSuccessfulBodySync } =
    useAppleHealthBodySync(onAppleHealthBodySynced);
  const syncAppleHealthBodyNowRef = useRef(syncAppleHealthBodyNow);
  syncAppleHealthBodyNowRef.current = syncAppleHealthBodyNow;

  const derived = useMemo(() => {
    const markPeekRows = peek.status === "ready" ? peek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS;
    const markSet = bodyMarkerDays(filteredWeightPoints, markPeekRows, tz);
    const byDay = buildWeightByDayMap(filteredWeightPoints);

    const week: CalendarDay<BodyDayMarker>[] = weekDaysAnchor.map((day) => ({
      day,
      meta: { hasMeasurement: markSet.has(day) },
    }));

    if (filteredWeightPoints.length === 0) {
      return {
        weekDays: week,
        markedDays: markSet,
        byDay,
        recent: [] as BodyRecentItem[],
        stats: {
          changeKg: null as number | null,
          avgKg: null as number | null,
          highKg: null as number | null,
          lowKg: null as number | null,
        },
      };
    }

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
    const latest = [...filteredWeightPoints].sort((a, b) =>
      a.observedAt.localeCompare(b.observedAt),
    )[filteredWeightPoints.length - 1];
    const changeKg = latest && oldest ? latest.weightKg - oldest.weightKg : null;

    return {
      weekDays: week,
      markedDays: markSet,
      byDay,
      recent,
      stats: { changeKg, avgKg, highKg, lowKg },
    };
  }, [filteredWeightPoints, weekDaysAnchor, peek, tz]);

  const overview = useMemo(() => {
    const snapshotPeekRows =
      snapshotDayPeek.status === "ready" ? snapshotDayPeek.items : EMPTY_BODY_SNAPSHOT_PEEK_ROWS;
    const dailyFactsBody =
      dayFacts.status === "ready" ? dailyFactsBodyForSnapshot(dayFacts.data.body) : null;
    return buildBodyOverviewSnapshot({
      todayDayKey: today,
      weightPoints: filteredWeightPoints,
      peekRows,
      snapshotPeekRows,
      dailyFactsBody,
      byDay: derived.byDay,
      tz,
    });
  }, [
    today,
    filteredWeightPoints,
    peekRows,
    snapshotDayPeek,
    dayFacts,
    derived.byDay,
    tz,
  ]);

  const isSeriesBackgroundRefreshing =
    series.status === "partial" && peek.status === "ready" && overview.hasAnyMetric;

  /**
   * Flattened Apple Health–filtered weight samples for trend selectors. Uses peek while the 5Y
   * series hydrates so charts and deltas are not blocked on full pagination.
   */
  const weightSamples = useMemo(() => {
    if (series.status === "ready") {
      return bodyWeightSamplesFromPoints(seriesWeightPoints);
    }
    if (peek.status === "ready") {
      return bodyWeightSamplesFromPoints(peekWeightPoints);
    }
    return [];
  }, [series.status, seriesWeightPoints, peek.status, peekWeightPoints]);

  const weightWindowBounds = useMemo(() => rollingLookbackWindowForAnchorDay(factsDay, 90), [factsDay]);

  const weightWindowPoints = useMemo(() => {
    return filteredWeightPoints.filter(
      (p) => p.dayKey >= weightWindowBounds.start && p.dayKey <= weightWindowBounds.end,
    );
  }, [filteredWeightPoints, weightWindowBounds]);

  const weightBaseline = useMemo((): BodyWeightBaselineOverview => {
    if (filteredWeightPoints.length === 0) {
      if (series.status === "partial" || peek.status === "partial") {
        return { status: "partial" };
      }
      return { status: "missing" };
    }
    const windowSamples = weightWindowPoints.map((p) => ({
      weightKg: p.weightKg,
      observedAt: p.observedAt,
    }));
    return {
      status: "ready",
      model: buildWeightBaselineCardModel({
        currentWeightKg: overview.weightKg,
        windowSamples,
      }),
    };
  }, [filteredWeightPoints.length, series.status, peek.status, overview.weightKg, weightWindowPoints]);

  const refreshOverview = useCallback(() => {
    void peekRef.current.refetch({ cacheBust: `bodyFocusPeek:${Date.now()}` });
    void snapshotDayPeekRef.current.refetch({ cacheBust: `bodyFocusSnapshotPeek:${Date.now()}` });
    void dayFactsRef.current.refetch({ cacheBust: `bodyFocusFacts:${Date.now()}` });
    if (seriesRef.current.status === "ready") {
      void seriesRef.current.refetch({ cacheBust: `bodyFocusSeries:${Date.now()}` });
    }
    void syncAppleHealthBodyNowRef.current();
  }, []);

  return {
    today,
    series,
    peek,
    snapshotDayPeek,
    dayFacts,
    isBodySyncing,
    isSeriesBackgroundRefreshing,
    syncAppleHealthBodyNow,
    hasSuccessfulBodySync,
    refreshOverview,
    ...derived,
    overview,
    weightBaseline,
    weightSamples,
  };
}
