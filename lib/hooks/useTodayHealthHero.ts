import { useCallback, useMemo } from "react";
import type { TruthGetOptions } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildTodayHealthHeroViewModel,
  type TodayHealthHeroViewModel,
} from "@/lib/dashboard/todayHealthHero";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";
import { resolveUserProfileMainForUi } from "@/lib/data/profile/resolveUserProfileMainForUi";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useHealthScore } from "@/lib/data/useHealthScore";

export type UseTodayHealthHeroResult = {
  vm: TodayHealthHeroViewModel;
  energy: DailyEnergyCardDto | undefined;
  energyLoading: boolean;
  energyError: string | null;
  refetch: (opts?: TruthGetOptions) => void;
};

/**
 * Dash hero + shared Daily Energy payload from one `useDailyFacts` subscription.
 */
export function useTodayHealthHero(day: string): UseTodayHealthHeroResult {
  const { user, initializing } = useAuth();
  const facts = useDailyFacts(day);
  const health = useHealthScore(day);
  const { state: profileState } = useUserProfileMain();

  const firstName = useMemo(() => {
    const p = resolveUserProfileMainForUi(profileState);
    return p?.identity.firstName ?? null;
  }, [profileState]);

  const energy = useMemo(() => {
    if (facts.status !== "ready") return undefined;
    return facts.data.energy as DailyEnergyCardDto | undefined;
  }, [facts]);

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

  const refetch = useCallback(
    (opts?: TruthGetOptions) => {
      void facts.refetch(opts);
      void health.refetch(opts);
    },
    [facts.refetch, health.refetch],
  );

  return { vm, energy, energyLoading, energyError, refetch };
}
