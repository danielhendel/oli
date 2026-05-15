import { useCallback, useEffect, useMemo, useRef } from "react";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildTodayHealthHeroViewModel,
  type TodayHealthHeroViewModel,
} from "@/lib/dashboard/todayHealthHero";
import { buildDailySleepCardModel, type DailySleepCardModel } from "@/lib/data/dash/buildDailySleepCardModel";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import { resolveUserProfileMainForUi } from "@/lib/data/profile/resolveUserProfileMainForUi";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useHealthScore } from "@/lib/data/useHealthScore";
import { useSleepNight } from "@/lib/hooks/useSleepNight";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseTodayHealthHeroResult = {
  vm: TodayHealthHeroViewModel;
  energy: DailyEnergyCardDto | undefined;
  energyLoading: boolean;
  energyError: string | null;
  sleepCard: DailySleepCardModel | undefined;
  sleepCardLoading: boolean;
  /** True while re-fetching but a prior stable model is still shown (no skeleton). */
  sleepCardRefreshing: boolean;
  sleepCardError: string | null;
  refetch: (opts?: TruthGetOptions) => void;
};

/**
 * Dash hero plus shared truth payloads from `useDailyFacts`, `useHealthScore`, and `useSleepNight` (no API calls in screens).
 *
 * Daily Sleep uses canonical `GET /users/me/sleep-night` for the calendar day (bounded physiological resolution on the server).
 */
export function useTodayHealthHero(day: DayKey): UseTodayHealthHeroResult {
  const { user, initializing } = useAuth();
  const facts = useDailyFacts(day);
  const health = useHealthScore(day);
  const sleepNight = useSleepNight(day, { enabled: Boolean(user) && !initializing });
  const { state: profileState } = useUserProfileMain();

  const firstName = useMemo(() => {
    const p = resolveUserProfileMainForUi(profileState);
    return p?.identity.firstName ?? null;
  }, [profileState]);

  const energy = useMemo(() => {
    if (facts.status !== "ready") return undefined;
    return facts.data.energy as DailyEnergyCardDto | undefined;
  }, [facts]);

  const lastStableSleepCardRef = useRef<DailySleepCardModel | undefined>(undefined);
  const prevDayForSleepStickyRef = useRef(day);
  if (prevDayForSleepStickyRef.current !== day) {
    prevDayForSleepStickyRef.current = day;
    lastStableSleepCardRef.current = undefined;
  }

  const sleepCard = useMemo((): DailySleepCardModel | undefined => {
    if (!sleepNight.settled) return undefined;
    return buildDailySleepCardModel({
      day,
      ...(sleepNight.view?.resolution != null ? { resolution: sleepNight.view.resolution } : {}),
      sleepNight: sleepNight.view?.sleepNight,
      sleepNightSettled: sleepNight.settled,
    });
  }, [day, sleepNight.settled, sleepNight.view?.resolution, sleepNight.view?.sleepNight]);

  useEffect(() => {
    if (sleepCard) lastStableSleepCardRef.current = sleepCard;
  }, [sleepCard]);

  const vm = useMemo(() => {
    const dailyFactsSettled = facts.status !== "partial";
    const healthSettled = health.status !== "partial";

    const headerLoading =
      Boolean(user) && !initializing && profileState.status === "partial";

    const sleepRecoveryLoading =
      Boolean(user) && !initializing && (!dailyFactsSettled || !healthSettled);

    const dailyFactsData = facts.status === "ready" ? facts.data : undefined;
    const healthScore = health.status === "ready" ? health.data : undefined;

    return buildTodayHealthHeroViewModel({
      now: new Date(),
      firstName,
      dailyFacts: dailyFactsData,
      dailyFactsSettled,
      healthScore,
      healthSettled,
      headerLoading,
      sleepRecoveryLoading,
    });
  }, [user, initializing, facts, health, profileState, firstName]);

  const energyLoading = facts.status === "partial";
  const energyError = facts.status === "error" ? facts.error : null;

  const sleepCardLoadingCore = !sleepNight.settled || sleepNight.loading;
  const sleepCardError = sleepNight.error;

  const sleepCardForUi = sleepCard ?? lastStableSleepCardRef.current;
  const sleepCardLoading = sleepCardLoadingCore && sleepCardForUi == null;
  const sleepCardRefreshing = sleepCardLoadingCore && sleepCardForUi != null;

  const refetch = useCallback(
    (opts?: TruthGetOptions) => {
      void facts.refetch(opts);
      void health.refetch(opts);
      void sleepNight.refetch(opts);
    },
    [facts.refetch, health.refetch, sleepNight.refetch],
  );

  return {
    vm,
    energy,
    energyLoading,
    energyError,
    sleepCard: sleepCardForUi,
    sleepCardLoading,
    sleepCardRefreshing,
    sleepCardError,
    refetch,
  };
}
