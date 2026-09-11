// lib/onboarding/constants.ts
import { CURRENT_ONBOARDING_VERSION } from "@oli/contracts";

export { CURRENT_ONBOARDING_VERSION };

export const ONBOARDING_DRAFT_KEY_PREFIX = "onboarding:draft:v1:u:";

export function onboardingDraftStorageKey(uid: string): string {
  return `${ONBOARDING_DRAFT_KEY_PREFIX}${uid}`;
}

export const ONBOARDING_ROUTES = {
  opening: "/(onboarding)",
  aboutYou: "/(onboarding)/about-you",
  connect: "/(onboarding)/connect",
  understand: "/(onboarding)/understand",
} as const;

export const OPENING_COPY = {
  brand: "Oli",
  headline: "Pursue Excellence.",
  lines: [
    "Understand where you are.",
    "See how you’re progressing.",
    "Discover how good you can become.",
  ] as const,
  primaryCta: "Get Started",
  secondaryCta: "Sign In",
} as const;

export const ABOUT_YOU_COPY = {
  title: "Let’s get to know you.",
  subtitle: "Only information required to interpret health and performance data correctly.",
  continueCta: "Continue",
  sexHint: "Used only where health interpretation requires it.",
} as const;

export const CONNECT_COPY = {
  title: "Bring your health together.",
  subtitle: "Connect what you already use.",
  laterCta: "I’ll do this later",
  continueCta: "Continue",
  appleHealthPrePermissionTitle: "Connect Apple Health",
  appleHealthPrePermissionBody:
    "Oli will ask iOS for access to workouts, steps, activity, sleep, and body metrics. You can change access anytime in iOS Settings. Connecting is for this Oli account only — device permission alone does not connect another account.",
  appleHealthPrePermissionContinue: "Continue",
  appleHealthPrePermissionCancel: "Cancel",
} as const;

export const UNDERSTAND_COPY = {
  title: "Building your health picture…",
  subtitle: "Checking what Oli can see from your profile and connected sources.",
  continueCta: "See My Health",
  summaryStarting: "Your health picture is starting to take shape.",
  summaryNeedsData:
    "You’re ready to begin. Oli needs more data before it can assess your health and performance.",
  summaryPartial: "Some areas still need more information.",
  summarySyncing: "Your first sync may continue in the background.",
} as const;

/** Ownership escape routes reachable during onboarding (Account menu). */
export const ONBOARDING_OWNERSHIP_HREFS = {
  account: "/(app)/settings/account",
  privacy: "/(app)/settings/privacy",
  yourData: "/(app)/settings/your-data",
  deleteAccount: "/(app)/settings/delete-account",
} as const;
