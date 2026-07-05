import { useCallback, useMemo } from "react";

import type { TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import {
  NUTRITION_KCAL_GOAL,
  NUTRITION_PROTEIN_G_GOAL,
} from "@/lib/data/nutrition/nutritionGoals";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useReadinessView } from "@/lib/data/useReadinessView";
import { useSleepNight } from "@/lib/hooks/useSleepNight";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { resolveWeeklyFitnessGoals } from "@/lib/preferences/weeklyFitnessGoals";
import { shiftAnchor } from "@/lib/time/timelineRange";
import { buildTodayCommandModel } from "@/lib/today/buildTodayCommandModel";
import type { TodayCommandModel } from "@/lib/today/types";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseTodayCommandResult = {
  model: TodayCommandModel | null;
  loading: boolean;
  error: string | null;
  refetch: (opts?: TruthGetOptions) => void;
};

function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function useTodayCommand(day: DayKey): UseTodayCommandResult {
  const { user, initializing } = useAuth();
  const priorDay = useMemo(() => shiftAnchor(day, -1), [day]);
  const todayFacts = useDailyFacts(day);
  const priorFacts = useDailyFacts(priorDay);
  const readiness = useReadinessView(day);
  const sleepNight = useSleepNight(day, { enabled: Boolean(user) && !initializing });
  const ouraPresence = useOuraPresence();
  const { state: prefState } = usePreferences();

  const goals = useMemo(
    () => resolveWeeklyFitnessGoals(prefState.preferences),
    [prefState.preferences, prefState.preferences.weeklyFitnessGoals?.updatedAt],
  );

  const { hkToday } = useActivityHealthKitTodayStepsCard({
    todayDayKey: day,
    enabled: Boolean(user) && !initializing,
  });

  const loading =
    Boolean(user) &&
    !initializing &&
    (todayFacts.status === "partial" ||
      priorFacts.status === "partial" ||
      readiness.status === "partial" ||
      (sleepNight.loading && !sleepNight.settled));

  const error = useMemo((): string | null => {
    if (loading) return null;
    if (todayFacts.status === "error") return todayFacts.error;
    return null;
  }, [loading, todayFacts]);

  const model = useMemo((): TodayCommandModel | null => {
    if (!user || initializing) return null;
    if (todayFacts.status !== "ready" || todayFacts.data.date !== day) return null;

    const todayStepsOverride =
      hkToday.status === "ready" && typeof hkToday.steps === "number" ? hkToday.steps : null;

    const priorData =
      priorFacts.status === "ready" && priorFacts.data.date === priorDay
        ? priorFacts.data
        : null;

    const readinessData = readiness.status === "ready" ? readiness.data : null;

    const ouraConnected =
      ouraPresence.status === "ready" ? ouraPresence.data.connected : null;

    const sleepNightView =
      sleepNight.settled && sleepNight.view?.requestedDay === day ? sleepNight.view : null;

    return buildTodayCommandModel({
      day,
      timezone: localTimezone(),
      todayFacts: todayFacts.data,
      priorDayFacts: priorData,
      todayStepsOverride,
      goals,
      calorieTargetKcal: NUTRITION_KCAL_GOAL,
      proteinTargetG: NUTRITION_PROTEIN_G_GOAL,
      nutritionTargetsAreDefault: true,
      sleepNightView,
      readinessView: readinessData,
      ouraConnected,
      lastUpdatedAt: todayFacts.data.computedAt ?? null,
    });
  }, [
    user,
    initializing,
    todayFacts,
    day,
    hkToday,
    priorFacts,
    priorDay,
    goals,
    sleepNight.settled,
    sleepNight.view,
    readiness,
    ouraPresence,
  ]);

  const refetchTodayFacts = todayFacts.refetch;
  const refetchPriorFacts = priorFacts.refetch;
  const refetchReadiness = readiness.refetch;
  const refetchSleepNight = sleepNight.refetch;

  const refetch = useCallback(
    (opts?: TruthGetOptions) => {
      void refetchTodayFacts(opts);
      void refetchPriorFacts(opts);
      void refetchReadiness(opts);
      void refetchSleepNight(opts);
    },
    [refetchTodayFacts, refetchPriorFacts, refetchReadiness, refetchSleepNight],
  );

  return useMemo(
    () => ({ model, loading, error, refetch }),
    [model, loading, error, refetch],
  );
}
