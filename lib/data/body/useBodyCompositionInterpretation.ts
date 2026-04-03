import { useMemo } from "react";
import { defaultUserProfileMain, type UserProfileMain } from "@oli/contracts";
import {
  buildBodyOverviewInterpretations,
  type BodyOverviewInterpretations,
  type BodyOverviewMetrics,
} from "@/lib/body/bodyCompositionInterpretation";
import { useUserProfileMain, type UserProfileMainState } from "@/lib/data/profile/useUserProfileMain";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

export function resolveUserProfileMainForInterpretation(state: UserProfileMainState): UserProfileMain {
  if (state.status === "ready") return state.profile ?? defaultUserProfileMain();
  if (state.status === "partial" && state.profile != null) return state.profile;
  if (state.status === "error" && state.profile != null) return state.profile;
  return defaultUserProfileMain();
}

export function useBodyCompositionInterpretation(overview: BodyOverviewMetrics): BodyOverviewInterpretations {
  const { state } = useUserProfileMain();
  const { state: prefState } = usePreferences();
  const profile = useMemo(() => resolveUserProfileMainForInterpretation(state), [state]);
  const massUnit = prefState.preferences.units.mass;
  return useMemo(
    () => buildBodyOverviewInterpretations(profile, overview, { massDisplayUnit: massUnit }),
    [profile, overview, massUnit],
  );
}
