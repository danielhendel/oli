import type { SleepNightViewDto } from "@oli/contracts";

import type { Readiness } from "@/lib/contracts/readiness";
import {
  buildDailySleepCardModel,
  type DailySleepCardModel,
} from "@/lib/data/dash/buildDailySleepCardModel";
import type { UseSleepNightResult } from "@/lib/hooks/useSleepNight";

/**
 * Optional missing-reason discriminator. Drives "Reconnect Oura" copy + CTA when Oura is the
 * proven root cause of empty sleep. Default `"no_data"` (or omitted) keeps the classic copy.
 */
export type DailySleepCardMissingReason = "oura_disconnected" | "no_data";

/** CTA payload rendered alongside the `missing` state when `reason === "oura_disconnected"`. */
export type DailySleepCardCta = {
  label: string;
  href: string;
};

/** Canonical readiness only — `partial` while sleep-night truth is not yet settled. */
export type DailySleepCardViewModel =
  | { status: Extract<Readiness, "partial">; day: string }
  | {
      status: Extract<Readiness, "missing">;
      day: string;
      message: string;
      reason?: DailySleepCardMissingReason;
      cta?: DailySleepCardCta;
    }
  | { status: Extract<Readiness, "error">; day: string; message: string }
  | { status: Extract<Readiness, "ready">; day: string; model: DailySleepCardModel; isRefreshing: boolean };

const MISSING_MESSAGE = "No sleep data logged for this day.";
const OURA_DISCONNECTED_MESSAGE = "Reconnect Oura to sync your sleep.";
const OURA_RECONNECT_CTA: DailySleepCardCta = {
  label: "Reconnect Oura \u2192",
  href: "/(app)/settings/devices/oura",
};

/**
 * Dash Daily Sleep only surfaces sleep attributed to the requested calendar day:
 * exact anchor on D, or a complete prior anchor whose wake day is D.
 * Bounded `latest_completed_prior_night` is never shown as current-day truth.
 */
export function sleepNightIsAttributedToCalendarDay(
  requestedDay: string,
  view: SleepNightViewDto | undefined,
): boolean {
  if (view == null) return false;
  if (view.requestedDay !== requestedDay) return false;
  if (view.resolution === "latest_completed_prior_night") return false;
  if (view.resolution === "exact_anchor") {
    return view.anchorDay === requestedDay && view.sleepNight.anchorDay === view.anchorDay;
  }
  if (view.resolution === "wake_day") {
    return view.wakeDay === requestedDay && view.sleepNight.wakeDay === requestedDay;
  }
  return false;
}

export type BuildDailySleepCardViewModelInput = {
  day: string;
  sleepNight: Pick<UseSleepNightResult, "view" | "loading" | "settled" | "error">;
  /**
   * Optional. When `true`, settled-and-missing renders the Oura reconnect copy + CTA.
   * Computed in the hook layer from `useOuraPresence` (only `ready && !connected`).
   * Never flip `true` while presence is `partial` or `error` — the prompt would flash.
   */
  ouraDisconnected?: boolean;
};

function buildMissingViewModel(
  day: string,
  ouraDisconnected: boolean,
): Extract<DailySleepCardViewModel, { status: "missing" }> {
  if (ouraDisconnected) {
    return {
      status: "missing",
      day,
      message: OURA_DISCONNECTED_MESSAGE,
      reason: "oura_disconnected",
      cta: OURA_RECONNECT_CTA,
    };
  }
  return { status: "missing", day, message: MISSING_MESSAGE, reason: "no_data" };
}

export function buildDailySleepCardViewModel(
  input: BuildDailySleepCardViewModelInput,
): DailySleepCardViewModel {
  const { day, sleepNight } = input;
  const ouraDisconnected = input.ouraDisconnected === true;
  const attributed = sleepNightIsAttributedToCalendarDay(day, sleepNight.view);

  if (!sleepNight.settled || (!attributed && sleepNight.loading)) {
    return { status: "partial", day };
  }

  if (sleepNight.error) {
    return { status: "error", day, message: sleepNight.error };
  }

  if (!attributed) {
    return buildMissingViewModel(day, ouraDisconnected);
  }

  const view = sleepNight.view;
  if (view == null) {
    return buildMissingViewModel(day, ouraDisconnected);
  }

  const model = buildDailySleepCardModel({
    day,
    resolution: view.resolution,
    sleepNight: view.sleepNight,
    sleepNightSettled: true,
  });

  if (model.day !== day) {
    return buildMissingViewModel(day, ouraDisconnected);
  }

  return {
    status: "ready",
    day,
    model,
    isRefreshing: sleepNight.loading,
  };
}

import { isDebugDataLogsEnabled } from "@/lib/dev/debugDataLogs";

export function logDailySleepTruthDev(input: {
  requestedDay: string;
  factsStatus: string;
  factsDay: string | null;
  sleepSettled: boolean;
  sleepResolution: string | null;
  sleepRequestedDay: string | null;
  renderStatus: DailySleepCardViewModel["status"];
  blockedStale: boolean;
}): void {
  if (!__DEV__) return;
  if (!isDebugDataLogsEnabled()) return;
  // eslint-disable-next-line no-console -- dev-only truth audit (no PII)
  console.log(
    `[DAILY_SLEEP_TRUTH] requestedDay=${input.requestedDay} factsStatus=${input.factsStatus} factsDay=${input.factsDay ?? "null"} renderStatus=${input.renderStatus} blockedStale=${input.blockedStale} sleepSettled=${input.sleepSettled} sleepResolution=${input.sleepResolution ?? "null"} sleepRequestedDay=${input.sleepRequestedDay ?? "null"}`,
  );
}
