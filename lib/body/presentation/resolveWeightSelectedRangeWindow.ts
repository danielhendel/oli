/**
 * Selected-period window for Weight (and Body metric) trend presentation.
 *
 * Authority: requested windows are **today-anchored** in production via
 * {@link getTodayDayKey} — the same contract as the RawEvent history fetch
 * ({@link rangeToStartEnd} / {@link resolveBodyHistoryQueryWindow}). Presentation
 * end uses the anchor day (no query end-buffer). Do not invent coverage beyond
 * the latest observation actually plotted.
 *
 * Tests may pass `anchorDayKey` to pin the window deterministically.
 *
 * Pure — no React / network.
 */
import {
  requestedStartDayKeyForAnchor,
  type WeightRangeKey,
} from "@/lib/data/body/bodyHistoryRange";
import { getTodayDayKey } from "@/lib/time/dayKey";

export type WeightSelectedRangeWindow = {
  readonly selectedRange: WeightRangeKey;
  /** Inclusive start dayKey, or null for All (unbounded by duration). */
  readonly start: string | null;
  /** Inclusive end dayKey (anchor / “today” for finite ranges). */
  readonly end: string;
};

/**
 * Deterministic requested window for a selected duration.
 * `All` has no theoretical start — coverage is earliest→latest observations.
 */
export function resolveWeightSelectedRangeWindow(
  range: WeightRangeKey,
  opts?: { readonly anchorDayKey?: string },
): WeightSelectedRangeWindow {
  const end = opts?.anchorDayKey ?? getTodayDayKey();
  if (range === "All") {
    return { selectedRange: range, start: null, end };
  }
  return {
    selectedRange: range,
    start: requestedStartDayKeyForAnchor(range, end),
    end,
  };
}
