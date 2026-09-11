// lib/onboarding/advanceOnboardingStep.ts
import {
  CURRENT_ONBOARDING_VERSION,
  type OnboardingStep,
  type OnboardingStatus,
  type UserProfileMain,
  type UserProfileMainPatch,
} from "@oli/contracts";

import { putUserProfileMain } from "@/lib/api/profileMain";
import type { ApiResult } from "@/lib/api/http";

export type AdvanceOnboardingArgs = {
  idToken: string;
  status: OnboardingStatus;
  step: OnboardingStep | null;
  version?: number;
};

export function buildOnboardingPatch(args: {
  status: OnboardingStatus;
  step: OnboardingStep | null;
  version?: number;
}): UserProfileMainPatch {
  return {
    app: {
      onboarding: {
        version: args.version ?? CURRENT_ONBOARDING_VERSION,
        status: args.status,
        step: args.step,
      },
    },
  };
}

export async function advanceOnboardingStep(
  args: AdvanceOnboardingArgs,
): Promise<ApiResult<UserProfileMain>> {
  const patch = buildOnboardingPatch({
    status: args.status,
    step: args.step,
    version: args.version,
  });
  return putUserProfileMain(args.idToken, patch);
}

export async function markOnboardingConnect(idToken: string): Promise<ApiResult<UserProfileMain>> {
  return advanceOnboardingStep({
    idToken,
    status: "in_progress",
    step: "connect",
  });
}

export async function markOnboardingUnderstand(idToken: string): Promise<ApiResult<UserProfileMain>> {
  return advanceOnboardingStep({
    idToken,
    status: "in_progress",
    step: "understand",
  });
}

export async function markOnboardingCompleted(idToken: string): Promise<ApiResult<UserProfileMain>> {
  return advanceOnboardingStep({
    idToken,
    status: "completed",
    step: "understand",
  });
}
