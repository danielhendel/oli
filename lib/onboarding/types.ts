// lib/onboarding/types.ts
import type { OnboardingStep, OnboardingStatus, ProfileSexAtBirth } from "@oli/contracts";

export type OnboardingRouteId =
  | "opening"
  | "about_you"
  | "connect"
  | "understand"
  | "home"
  | "auth"
  | "blocked"
  | "deletion_recovery";

export type OnboardingRouteState =
  | { kind: "signed_out" }
  | { kind: "resolving" }
  | { kind: "opening" }
  | { kind: "about_you" }
  | { kind: "connect" }
  | { kind: "understand" }
  | { kind: "completed" }
  | { kind: "blocked_error"; message: string }
  | { kind: "deletion_pending" };

export type AboutYouDraft = {
  preferredName: string;
  /** Month digits 1–12 (display string). */
  birthMonth: string;
  /** Day digits 1–31 (display string). */
  birthDay: string;
  /** Year digits YYYY (display string). */
  birthYear: string;
  sexAtBirth: ProfileSexAtBirth | "";
  heightCm: string;
  weightValue: string;
  weightUnit: "kg" | "lb";
  lengthUnit: "cm" | "in";
  heightFeet: string;
  heightInches: string;
};

export type AboutYouFieldErrors = Partial<
  Record<
    "preferredName" | "dateOfBirth" | "sexAtBirth" | "height" | "weight",
    string
  >
>;

export type ConnectSourceId = "apple_health" | "oura";

export type ConnectSourceCardState =
  | { id: ConnectSourceId; status: "idle" }
  | { id: ConnectSourceId; status: "connecting" }
  | { id: ConnectSourceId; status: "connected" }
  | { id: ConnectSourceId; status: "unavailable"; reason: string }
  | { id: ConnectSourceId; status: "error"; message: string };

export type ReadinessSignalState = "present" | "missing" | "unavailable";

export type DataReadinessViewModel = {
  title: string;
  subtitle: string;
  /** Honest closing line after signals resolve. */
  summary: string;
  signals: {
    id: "profile" | "weight" | "steps" | "sleep" | "apple_health" | "oura";
    label: string;
    state: ReadinessSignalState;
    detail: string;
  }[];
  canContinue: boolean;
};

export type OnboardingServerSnapshot = {
  version: number;
  status: OnboardingStatus;
  step: OnboardingStep | null;
  completedAt: string | null;
  updatedAt: string | null;
};
