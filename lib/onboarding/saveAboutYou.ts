// lib/onboarding/saveAboutYou.ts
import {
  CURRENT_ONBOARDING_VERSION,
  type UserProfileMain,
  type UserProfileMainPatch,
} from "@oli/contracts";

import { putUserProfileMain } from "@/lib/api/profileMain";
import { logWeight } from "@/lib/api/usersMe";
import type { ApiResult } from "@/lib/api/http";

import { validateAboutYouDraft, type AboutYouValidated } from "./aboutYouValidation";
import { clearAboutYouDraft } from "./onboardingDraftStorage";
import type { AboutYouDraft, AboutYouFieldErrors } from "./types";

export type SaveAboutYouResult =
  | { ok: true; profile: UserProfileMain }
  | { ok: false; kind: "validation"; errors: AboutYouFieldErrors }
  | { ok: false; kind: "api"; message: string };

function deviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

/** Profile patch that completes Stage 2 profile-only onboarding in one write. */
export function buildAboutYouProfilePatch(value: AboutYouValidated): UserProfileMainPatch {
  return {
    identity: {
      firstName: value.preferredName,
      dateOfBirth: value.dateOfBirth,
      sexAtBirth: value.sexAtBirth,
    },
    body: {
      heightCm: value.heightCm,
    },
    app: {
      onboarding: {
        status: "completed",
        step: "about_you",
        version: CURRENT_ONBOARDING_VERSION,
      },
    },
  };
}

export async function saveAboutYou(args: {
  uid: string;
  idToken: string;
  draft: AboutYouDraft;
}): Promise<SaveAboutYouResult> {
  const validated = validateAboutYouDraft(args.draft);
  if (!validated.ok) {
    return { ok: false, kind: "validation", errors: validated.errors };
  }

  const profilePatch = buildAboutYouProfilePatch(validated.value);
  const profileRes = await putUserProfileMain(args.idToken, profilePatch);
  if (!profileRes.ok) {
    return {
      ok: false,
      kind: "api",
      message: profileRes.error || "Could not save your profile.",
    };
  }

  if (validated.value.weightKg != null) {
    const weightRes = await logWeight(
      {
        time: new Date().toISOString(),
        timezone: deviceTimezone(),
        weightKg: validated.value.weightKg,
      },
      args.idToken,
    );
    if (!weightRes.ok) {
      return {
        ok: false,
        kind: "api",
        message: weightRes.error || "Profile saved, but weight could not be logged.",
      };
    }
  }

  await clearAboutYouDraft(args.uid).catch(() => undefined);
  return { ok: true, profile: profileRes.json };
}

/** Test helper type export */
export type { ApiResult };
