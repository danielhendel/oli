// lib/data/target-state/useTargetState.ts
import { useMemo } from "react";

import { useCurrentStateProfile } from "@/lib/data/health-assessment/healthAssessmentStore";
import { useHealthBaseline } from "@/lib/data/health-baseline/useHealthBaseline";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { buildTargetStateRoadmap } from "@/lib/data/target-state/buildTargetStateRoadmap";
import { buildTargetStateSummary } from "@/lib/data/target-state/buildTargetStateSummary";
import type { TargetStateRoadmap, TargetStateSummary } from "@/lib/data/target-state/types";

export type TargetStateLoadState = "loading" | "ready" | "error" | "signed-out";

export type UseTargetStateResult = {
  state: TargetStateLoadState;
  roadmap: TargetStateRoadmap | null;
  summary: TargetStateSummary | null;
  errorMessage: string | null;
  refetch: () => void;
};

function resolveSexForClassification(
  sexAtBirth: string | null | undefined,
): "male" | "female" | null {
  if (sexAtBirth === "male" || sexAtBirth === "female") return sexAtBirth;
  return null;
}

export function useTargetState(): UseTargetStateResult {
  const { state: baselineState, baseline, errorMessage, refetch } = useHealthBaseline();
  const currentStateProfile = useCurrentStateProfile();
  const { state: profileState } = useUserProfileMain();

  const sex = useMemo(() => {
    if (
      profileState.status !== "ready" &&
      profileState.status !== "partial" &&
      profileState.status !== "error"
    ) {
      return null;
    }
    const profile = profileState.profile ?? null;
    return resolveSexForClassification(profile?.identity.sexAtBirth);
  }, [profileState]);

  const roadmap = useMemo(() => {
    if (baselineState === "loading" || baselineState === "signed-out") return null;
    return buildTargetStateRoadmap({
      baseline,
      currentStateProfile,
      sex,
    });
  }, [baselineState, baseline, currentStateProfile, sex]);

  const summary = useMemo(
    () => (roadmap != null ? buildTargetStateSummary(roadmap) : null),
    [roadmap],
  );

  const state: TargetStateLoadState =
    baselineState === "signed-out"
      ? "signed-out"
      : baselineState === "loading"
        ? "loading"
        : baselineState === "error"
          ? "error"
          : "ready";

  return {
    state,
    roadmap,
    summary,
    errorMessage,
    refetch,
  };
}
