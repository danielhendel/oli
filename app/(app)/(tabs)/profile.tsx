// app/(app)/(tabs)/profile.tsx
// Digital Twin home (Manage → Profile). Thin: composes profile identity + Digital Twin VM.
import React, { useMemo } from "react";

import { ProfileMainScreen } from "@/lib/ui/profile/ProfileMainScreen";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { buildProfileTabViewModel } from "@/lib/data/profile/profileTabViewModel";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { useDigitalTwinHome } from "@/lib/features/profile/digitalTwin/useDigitalTwinHome";
import { hasAssessmentProgress } from "@/lib/data/health-assessment/buildCurrentStateProfile";
import { HEALTH_ASSESSMENT_ROUTES } from "@/lib/data/health-assessment/routes";
import {
  useCurrentStateProfile,
  useHealthAssessmentState,
} from "@/lib/data/health-assessment/healthAssessmentStore";
import { HEALTH_BASELINE_ROUTES } from "@/lib/data/health-baseline/routes";
import { useHealthBaseline } from "@/lib/data/health-baseline/useHealthBaseline";
import { buildTargetStateRoadmap } from "@/lib/data/target-state/buildTargetStateRoadmap";
import { TARGET_STATE_ROUTES } from "@/lib/data/target-state/routes";

function resolveSexForClassification(
  sexAtBirth: string | null | undefined,
): "male" | "female" | null {
  if (sexAtBirth === "male" || sexAtBirth === "female") return sexAtBirth;
  return null;
}

export default function ProfileTabScreen() {
  const { state } = useUserProfileMain();
  const { state: prefState } = usePreferences();
  const { vm: twin } = useDigitalTwinHome();
  const assessmentState = useHealthAssessmentState();
  const assessmentProfile = useCurrentStateProfile();
  const { baseline: healthBaseline } = useHealthBaseline();

  const sex = useMemo(() => {
    if (state.status !== "ready" && state.status !== "partial" && state.status !== "error") {
      return null;
    }
    return resolveSexForClassification(state.profile?.identity.sexAtBirth);
  }, [state]);

  const targetRoadmap = useMemo(
    () =>
      buildTargetStateRoadmap({
        baseline: healthBaseline,
        currentStateProfile: assessmentProfile,
        sex,
      }),
    [healthBaseline, assessmentProfile, sex],
  );

  const vm = buildProfileTabViewModel(state);

  return (
    <ProfileMainScreen
      profile={vm.profile}
      status={vm.displayStatus}
      hydrating={vm.hydrating}
      isSaving={vm.isSaving}
      {...(vm.errorMessage !== undefined ? { errorMessage: vm.errorMessage } : {})}
      massUnit={prefState.preferences.units.mass}
      twin={twin}
      healthAssessmentHref={HEALTH_ASSESSMENT_ROUTES.assessment}
      healthAssessmentHasProgress={hasAssessmentProgress(assessmentState)}
      healthAssessmentCompletionPercent={assessmentProfile.completionPercent}
      healthBaselineHref={HEALTH_BASELINE_ROUTES.baseline}
      healthBaselineCompleteness={healthBaseline?.dataCompleteness ?? null}
      healthBaselineConfidence={healthBaseline?.baselineConfidence ?? null}
      targetStateHref={TARGET_STATE_ROUTES.targetState}
      targetStateCoverage={targetRoadmap.dataCoveragePercent}
      targetStateConfidence={targetRoadmap.targetStateConfidence}
    />
  );
}
