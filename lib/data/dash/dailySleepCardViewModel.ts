import type { SleepNightViewDto } from "@oli/contracts";

import type { Readiness } from "@/lib/contracts/readiness";
import {
  buildDailySleepCardModel,
  type DailySleepCardModel,
} from "@/lib/data/dash/buildDailySleepCardModel";
import type { UseSleepNightResult } from "@/lib/hooks/useSleepNight";

/** Canonical readiness only — `partial` while sleep-night truth is not yet settled. */
export type DailySleepCardViewModel =
  | { status: Extract<Readiness, "partial">; day: string }
  | { status: Extract<Readiness, "missing">; day: string; message: string }
  | { status: Extract<Readiness, "error">; day: string; message: string }
  | { status: Extract<Readiness, "ready">; day: string; model: DailySleepCardModel; isRefreshing: boolean };

const MISSING_MESSAGE = "No sleep data logged for this day.";

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
};

export function buildDailySleepCardViewModel(
  input: BuildDailySleepCardViewModelInput,
): DailySleepCardViewModel {
  const { day, sleepNight } = input;
  const attributed = sleepNightIsAttributedToCalendarDay(day, sleepNight.view);

  if (!sleepNight.settled || (!attributed && sleepNight.loading)) {
    return { status: "partial", day };
  }

  if (sleepNight.error) {
    return { status: "error", day, message: sleepNight.error };
  }

  if (!attributed) {
    return { status: "missing", day, message: MISSING_MESSAGE };
  }

  const view = sleepNight.view;
  if (view == null) {
    return { status: "missing", day, message: MISSING_MESSAGE };
  }

  const model = buildDailySleepCardModel({
    day,
    resolution: view.resolution,
    sleepNight: view.sleepNight,
    sleepNightSettled: true,
  });

  if (model.day !== day) {
    return { status: "missing", day, message: MISSING_MESSAGE };
  }

  return {
    status: "ready",
    day,
    model,
    isRefreshing: sleepNight.loading,
  };
}

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
  // eslint-disable-next-line no-console -- dev-only truth audit (no PII)
  console.log(
    `[DAILY_SLEEP_TRUTH] requestedDay=${input.requestedDay} factsStatus=${input.factsStatus} factsDay=${input.factsDay ?? "null"} renderStatus=${input.renderStatus} blockedStale=${input.blockedStale} sleepSettled=${input.sleepSettled} sleepResolution=${input.sleepResolution ?? "null"} sleepRequestedDay=${input.sleepRequestedDay ?? "null"}`,
  );
}
