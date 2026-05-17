import { useCallback, useEffect, useMemo } from "react";
import { logDailySleepTruthDev } from "@/lib/data/dash/dailySleepCardViewModel";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildTodayHealthHeroViewModel,
  type TodayHealthHeroViewModel,
} from "@/lib/dashboard/todayHealthHero";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import { resolveUserProfileMainForUi } from "@/lib/data/profile/resolveUserProfileMainForUi";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useHealthScore } from "@/lib/data/useHealthScore";
import { useDailySleepCard } from "@/lib/hooks/useDailySleepCard";
import type { DayKey } from "@/lib/ui/calendar/types";

export type UseTodayHealthHeroResult = {
  vm: TodayHealthHeroViewModel;
  energy: DailyEnergyCardDto | undefined;
  energyLoading: boolean;
  energyError: string | null;
  sleepCardVm: DailySleepCardViewModel;
  refetch: (opts?: TruthGetOptions) => void;
};

/**
 * Dash hero plus shared truth payloads from `useDailyFacts`, `useHealthScore`, and `useDailySleepCard`.
 */
export function useTodayHealthHero(day: DayKey): UseTodayHealthHeroResult {
  const { user, initializing } = useAuth();
  const facts = useDailyFacts(day);
  const health = useHealthScore(day);
  const dailySleep = useDailySleepCard(day, { enabled: Boolean(user) && !initializing });
  const { state: profileState } = useUserProfileMain();

  const firstName = useMemo(() => {
    const p = resolveUserProfileMainForUi(profileState);
    return p?.identity.firstName ?? null;
  }, [profileState]);

  const energy = useMemo(() => {
    if (facts.status !== "ready") return undefined;
    if (facts.data.date !== day) return undefined;
    return facts.data.energy as DailyEnergyCardDto | undefined;
  }, [facts, day]);

  const vm = useMemo(() => {
    const dailyFactsSettled = facts.status !== "partial";
    const healthSettled = health.status !== "partial";

    const headerLoading =
      Boolean(user) && !initializing && profileState.status === "partial";

    const sleepRecoveryLoading =
      Boolean(user) && !initializing && (!dailyFactsSettled || !healthSettled);

    const dailyFactsData =
      facts.status === "ready" && facts.data.date === day ? facts.data : undefined;
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
  }, [user, initializing, facts, health, profileState, firstName, day]);

  const energyLoading = facts.status === "partial";
  const energyError = facts.status === "error" ? facts.error : null;

  const refetch = useCallback(
    (opts?: TruthGetOptions) => {
      void facts.refetch(opts);
      void health.refetch(opts);
      dailySleep.refetch(opts);
    },
    [facts.refetch, health.refetch, dailySleep.refetch],
  );

  useEffect(() => {
    if (!__DEV__) return;
    const factsDay = facts.status === "ready" && facts.data.date === day ? facts.data.date : null;
    logDailySleepTruthDev({
      requestedDay: day,
      factsStatus: facts.status,
      factsDay,
      sleepSettled: dailySleep.truthDebug.sleepSettled,
      sleepResolution: dailySleep.truthDebug.sleepResolution,
      sleepRequestedDay: dailySleep.truthDebug.sleepRequestedDay,
      renderStatus: dailySleep.vm.status,
      blockedStale: dailySleep.truthDebug.blockedStale,
    });
  }, [day, facts.status, facts.status === "ready" ? facts.data.date : null, dailySleep.vm, dailySleep.truthDebug]);

  return {
    vm,
    energy,
    energyLoading,
    energyError,
    sleepCardVm: dailySleep.vm,
    refetch,
  };
}
