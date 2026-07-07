import { useCallback, useMemo } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { BODY_COMPOSITION_METRIC_DETAIL_ROUTES } from "@/lib/data/body/bodyCompositionMetricRoutes";
import { getDeviceTimeZone } from "@/lib/data/body/deviceTimeZone";
import { useBodyCompositionInterpretation } from "@/lib/data/body/useBodyCompositionInterpretation";
import { useBodyOverviewData } from "@/lib/data/body/useBodyOverviewData";
import {
  buildBodyCompositionDashCardModel,
  type BuiltBodyCompositionDashCard,
  type BodyCompositionDashSeriesStatus,
} from "@/lib/data/dash/buildBodyCompositionDashCardModel";
import {
  formatAsOfReadingDayKeyOnly,
  formatAsOfReadingLabel,
} from "@/lib/date/formatRelativeReadingDate";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

/** Dash Body Composition card destinations (aligned with Body overview metric screens). */
export const BODY_COMPOSITION_DASH_ROUTES = {
  /** "My goal" — body composition settings (sources, devices). */
  goalsEditor: "/(app)/body/settings",
  /** Pass-through for tests / deep links that still target metric detail routes. */
  bmi: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bmi,
  bodyFat: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.bodyFat,
  leanMass: BODY_COMPOSITION_METRIC_DETAIL_ROUTES.leanMass,
} as const;

export type UseBodyCompositionDashCardResult = {
  loading: boolean;
  error: string | null;
  hasUser: boolean;
  goalsHref: string;
  /** Present after auth settles; may be `partial` while upstream series hydrates (prefer `loading`). */
  built: BuiltBodyCompositionDashCard | null;
  /** Refetch peek/facts and trigger Apple Health body sync (e.g. on Dash focus). */
  refresh: () => void;
};

function resolveSeriesStatus(body: ReturnType<typeof useBodyOverviewData>): BodyCompositionDashSeriesStatus {
  if (body.series.status === "error") return "error";
  if (body.series.status === "ready") return "ready";
  if (body.peek.status === "ready" && body.overview.hasAnyMetric) return "ready";
  return "partial";
}

export function useBodyCompositionDashCard(): UseBodyCompositionDashCardResult {
  const { user, initializing } = useAuth();
  const body = useBodyOverviewData();
  const overviewSlice = body.overview;

  const overviewMetrics = useMemo(
    () => ({
      weightKg: overviewSlice.weightKg,
      bodyFatPercent: overviewSlice.bodyFatPercent,
      bmi: overviewSlice.bmi,
      leanBodyMassKg: overviewSlice.leanBodyMassKg,
      hasAnyMetric: overviewSlice.hasAnyMetric,
    }),
    [
      overviewSlice.weightKg,
      overviewSlice.bodyFatPercent,
      overviewSlice.bmi,
      overviewSlice.leanBodyMassKg,
      overviewSlice.hasAnyMetric,
    ],
  );

  const interpretations = useBodyCompositionInterpretation({
    weightKg: overviewSlice.weightKg,
    bodyFatPercent: overviewSlice.bodyFatPercent,
    bmi: overviewSlice.bmi,
    leanBodyMassKg: overviewSlice.leanBodyMassKg,
    restingMetabolicRateKcal: overviewSlice.restingMetabolicRateKcal,
  });

  const { state: prefState } = usePreferences();
  const massUnit = prefState.preferences?.units?.mass ?? "lb";

  const seriesStatus = resolveSeriesStatus(body);
  const seriesError = body.series.status === "error" ? body.series.error : null;

  const peekHydrated = body.peek.status === "ready" && body.overview.hasAnyMetric;

  const loading =
    Boolean(user) &&
    !initializing &&
    !peekHydrated &&
    (seriesStatus === "partial" || body.peek.status === "partial");

  const refresh = useCallback(() => {
    body.refreshOverview();
  }, [body.refreshOverview]);

  const peekError = body.peek.status === "error" ? body.peek.error : null;

  const tz = getDeviceTimeZone();
  const readingAsOfLabel = useMemo((): string | null => {
    if (!overviewSlice.hasAnyMetric || overviewSlice.overviewDay == null) return null;
    if (overviewSlice.latestObservedAtIso != null) {
      return formatAsOfReadingLabel(overviewSlice.latestObservedAtIso, { timeZone: tz });
    }
    return formatAsOfReadingDayKeyOnly(overviewSlice.overviewDay, { timeZone: tz });
  }, [
    overviewSlice.hasAnyMetric,
    overviewSlice.overviewDay,
    overviewSlice.latestObservedAtIso,
    tz,
  ]);

  const built = useMemo((): BuiltBodyCompositionDashCard | null => {
    if (!user || initializing) return null;
    return buildBodyCompositionDashCardModel({
      seriesStatus,
      seriesError,
      overview: overviewMetrics,
      interpretations,
      massUnit,
      readingAsOfLabel,
    });
  }, [
    user,
    initializing,
    seriesStatus,
    seriesError,
    overviewMetrics,
    interpretations,
    massUnit,
    readingAsOfLabel,
  ]);

  const error = useMemo((): string | null => {
    if (!user || initializing || loading) return null;
    if (body.series.status === "error") return seriesError ?? "Body composition unavailable";
    if (peekError != null) return peekError;
    if (built?.tag === "error") return built.message;
    return null;
  }, [user, initializing, loading, body.series.status, seriesError, peekError, built]);

  return {
    loading: Boolean(initializing || (user && loading)),
    error,
    hasUser: Boolean(user),
    goalsHref: BODY_COMPOSITION_DASH_ROUTES.goalsEditor,
    built,
    refresh,
  };
}

export type { BodyCompositionDashMetricRow, BuiltBodyCompositionDashCard } from "@/lib/data/dash/buildBodyCompositionDashCardModel";
