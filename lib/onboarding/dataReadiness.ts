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

import { hasRequiredAboutYouProfile } from "./aboutYouProfileCompleteness";

function profileReady(profile: UserProfileMain | null): boolean {
  return hasRequiredAboutYouProfile(profile);
}

function buildSummary(signals: DataReadinessViewModel["signals"], input: DataReadinessInput): string {
  const healthSignals = signals.filter((s) => s.id === "weight" || s.id === "steps" || s.id === "sleep");
  const anyHealthPresent = healthSignals.some((s) => s.state === "present");
  const anyHealthUnavailable = healthSignals.some((s) => s.state === "unavailable");
  const anySourceConnected =
    input.appleHealthConnected === true || input.ouraConnected === true;

  if (anyHealthUnavailable && !anyHealthPresent) {
    return UNDERSTAND_COPY.summaryPartial;
  }
  if (anyHealthPresent) {
    const anyMissing = healthSignals.some((s) => s.state === "missing");
    return anyMissing ? UNDERSTAND_COPY.summaryPartial : UNDERSTAND_COPY.summaryStarting;
  }
  if (anySourceConnected) {
    return UNDERSTAND_COPY.summarySyncing;
  }
  return UNDERSTAND_COPY.summaryNeedsData;
}

/**
 * Honest readiness view model — present / missing / unavailable only.
 * No scores, recommendations, or fabricated baselines.
 */
export function buildDataReadinessViewModel(input: DataReadinessInput): DataReadinessViewModel {
  const signals: DataReadinessViewModel["signals"] = [];

  if (profileReady(input.profile)) {
    signals.push(signal("profile", "Profile", "present", "Saved."));
  } else {
    signals.push(signal("profile", "Profile", "missing", "Interpretation basics are not complete yet."));
  }

  if (!input.appleHealthAvailable) {
    signals.push(
      signal("apple_health", "Apple Health", "unavailable", "Not available on this device."),
    );
  } else if (input.appleHealthConnected === true) {
    signals.push(signal("apple_health", "Apple Health", "present", "Connected for this account."));
  } else if (input.appleHealthConnected === false) {
    signals.push(signal("apple_health", "Apple Health", "missing", "No health source connected."));
  } else {
    signals.push(signal("apple_health", "Apple Health", "unavailable", "Connection status is still loading."));
  }

  if (input.ouraConnected === true) {
    signals.push(signal("oura", "Oura", "present", "Connected."));
  } else if (input.ouraConnected === false) {
    signals.push(signal("oura", "Oura", "missing", "Not connected."));
  } else {
    signals.push(signal("oura", "Oura", "unavailable", "Connection status is still loading."));
  }

  const weightKg = input.dailyFacts?.body?.weightKg;
  if (typeof weightKg === "number" && Number.isFinite(weightKg)) {
    signals.push(signal("weight", "Recent health data", "present", "Weight is in today’s facts."));
  } else if (input.dailyFactsStatus === "error") {
    signals.push(signal("weight", "Recent health data", "unavailable", "Could not check recent data right now."));
  } else {
    signals.push(signal("weight", "Recent health data", "missing", "No recent health data yet."));
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
    summary: buildSummary(signals, input),
    signals,
    canContinue: true,
  };
}
