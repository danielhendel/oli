// lib/onboarding/dataReadiness.ts
import type { DailyFactsDto, UserProfileMain } from "@oli/contracts";

import { UNDERSTAND_COPY } from "./constants";
import type { DataReadinessViewModel, ReadinessSignalState } from "./types";

export type DataReadinessInput = {
  profile: UserProfileMain | null;
  appleHealthConnected: boolean | null;
  appleHealthAvailable: boolean;
  ouraConnected: boolean | null;
  dailyFacts: DailyFactsDto | null;
  dailyFactsStatus: "missing" | "partial" | "ready" | "error";
};

function signal(
  id: DataReadinessViewModel["signals"][number]["id"],
  label: string,
  state: ReadinessSignalState,
  detail: string,
): DataReadinessViewModel["signals"][number] {
  return { id, label, state, detail };
}

function profileReady(profile: UserProfileMain | null): boolean {
  if (!profile) return false;
  return (
    typeof profile.identity.firstName === "string" &&
    profile.identity.firstName.trim().length > 0 &&
    profile.identity.dateOfBirth != null &&
    profile.identity.sexAtBirth != null &&
    profile.body.heightCm != null
  );
}

/**
 * Honest readiness view model — present / missing / unavailable only.
 * No scores, recommendations, or fabricated baselines.
 */
export function buildDataReadinessViewModel(input: DataReadinessInput): DataReadinessViewModel {
  const signals: DataReadinessViewModel["signals"] = [];

  if (profileReady(input.profile)) {
    signals.push(signal("profile", "About you", "present", "Name, date of birth, sex, and height are saved."));
  } else {
    signals.push(signal("profile", "About you", "missing", "Interpretation basics are not complete yet."));
  }

  const weightKg = input.dailyFacts?.body?.weightKg;
  if (typeof weightKg === "number" && Number.isFinite(weightKg)) {
    signals.push(signal("weight", "Weight", "present", "A recent weight is in your record."));
  } else if (input.dailyFactsStatus === "error") {
    signals.push(signal("weight", "Weight", "unavailable", "Weight could not be checked right now."));
  } else {
    signals.push(signal("weight", "Weight", "missing", "No weight in today’s facts yet."));
  }

  if (!input.appleHealthAvailable) {
    signals.push(
      signal("apple_health", "Apple Health", "unavailable", "Apple Health is not available on this device."),
    );
  } else if (input.appleHealthConnected === true) {
    signals.push(signal("apple_health", "Apple Health", "present", "Connected for sync."));
  } else if (input.appleHealthConnected === false) {
    signals.push(signal("apple_health", "Apple Health", "missing", "Not connected yet."));
  } else {
    signals.push(signal("apple_health", "Apple Health", "unavailable", "Connection status is still loading."));
  }

  if (input.ouraConnected === true) {
    signals.push(signal("oura", "Oura", "present", "Connected."));
  } else if (input.ouraConnected === false) {
    signals.push(signal("oura", "Oura", "missing", "Not connected yet."));
  } else {
    signals.push(signal("oura", "Oura", "unavailable", "Connection status is still loading."));
  }

  const steps = input.dailyFacts?.activity?.steps;
  if (typeof steps === "number" && Number.isFinite(steps)) {
    signals.push(signal("steps", "Steps", "present", "Step data is present for today."));
  } else if (input.dailyFactsStatus === "error") {
    signals.push(signal("steps", "Steps", "unavailable", "Steps could not be checked right now."));
  } else {
    signals.push(signal("steps", "Steps", "missing", "No steps in today’s facts yet."));
  }

  const sleepMin = input.dailyFacts?.sleep?.totalMinutes ?? input.dailyFacts?.sleep?.mainSleepMinutes;
  if (typeof sleepMin === "number" && Number.isFinite(sleepMin)) {
    signals.push(signal("sleep", "Sleep", "present", "Sleep data is present for today."));
  } else if (input.dailyFactsStatus === "error") {
    signals.push(signal("sleep", "Sleep", "unavailable", "Sleep could not be checked right now."));
  } else {
    signals.push(signal("sleep", "Sleep", "missing", "No sleep in today’s facts yet."));
  }

  return {
    title: UNDERSTAND_COPY.title,
    subtitle: UNDERSTAND_COPY.subtitle,
    signals,
    canContinue: true,
  };
}
