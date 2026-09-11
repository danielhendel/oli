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
  secondaryCta: "I already have an account",
} as const;

export const ABOUT_YOU_COPY = {
  title: "About you",
  subtitle: "A few details so Oli can interpret your health data.",
  continueCta: "Continue",
} as const;

export const CONNECT_COPY = {
  title: "Bring your health together.",
  subtitle: "Connect what you already use.",
  laterCta: "I’ll do this later",
  continueCta: "Continue",
} as const;

export const UNDERSTAND_COPY = {
  title: "Building your health picture…",
  subtitle: "Oli shows what is present so far — missing data stays missing.",
  continueCta: "This is you. Continue to Home",
} as const;

/** Ownership escape routes reachable during onboarding (Account menu). */
export const ONBOARDING_OWNERSHIP_HREFS = {
  account: "/(app)/settings/account",
  privacy: "/(app)/settings/privacy",
  yourData: "/(app)/settings/your-data",
  deleteAccount: "/(app)/settings/delete-account",
} as const;
