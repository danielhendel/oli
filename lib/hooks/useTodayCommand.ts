import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getOuraSleepView, type TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useActivityHealthKitTodayStepsCard } from "@/lib/data/activity/useActivityHealthKitTodayStepsCard";
import {
  NUTRITION_KCAL_GOAL,
  NUTRITION_PROTEIN_G_GOAL,
} from "@/lib/data/nutrition/nutritionGoals";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { useReadinessView } from "@/lib/data/useReadinessView";
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
  const { user, initializing, getIdToken } = useAuth();
  const priorDay = useMemo(() => shiftAnchor(day, -1), [day]);
  const todayFacts = useDailyFacts(day);
  const priorFacts = useDailyFacts(priorDay);
  const readiness = useReadinessView(day);
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

  const [sleepView, setSleepView] = useState<
    import("@oli/contracts").SleepViewDto | null
  >(null);
  const [sleepLoading, setSleepLoading] = useState(false);
  const sleepSeq = useRef(0);

  const fetchSleep = useCallback(
    async (opts?: TruthGetOptions) => {
      if (initializing || !user) return;
      const seq = ++sleepSeq.current;
      setSleepLoading(true);
      try {
        const token = await getIdToken(false);
        if (!token || seq !== sleepSeq.current) return;
        const res = await getOuraSleepView(day, token, opts);
        if (seq !== sleepSeq.current) return;
        const outcome = truthOutcomeFromApiResult(res);
        if (outcome.status === "ready") {
          setSleepView(outcome.data);
        } else {
          setSleepView(null);
        }
      } finally {
        if (seq === sleepSeq.current) setSleepLoading(false);
      }
    },
    [day, getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchSleep();
  }, [fetchSleep]);

  const loading =
    Boolean(user) &&
    !initializing &&
    (todayFacts.status === "partial" ||
      priorFacts.status === "partial" ||
      readiness.status === "partial" ||
      sleepLoading);

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
      sleepView,
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
    sleepView,
    readiness,
    ouraPresence,
  ]);

  const refetch = useCallback(
    (opts?: TruthGetOptions) => {
      void todayFacts.refetch(opts);
      void priorFacts.refetch(opts);
      readiness.refetch(opts);
      void fetchSleep(opts);
    },
    [todayFacts, priorFacts, readiness, fetchSleep],
  );

  return { model, loading, error, refetch };
}
