import type { SleepViewDto } from "@oli/contracts";
import { isOuraViewAlignedToDay } from "@/lib/data/oura/isOuraViewAlignedToDay";

/**
 * Vendor sleep score for a calendar anchor day: exact-day only (no Oura fallback rows).
 * Matches the Sleep screen Oli path intent: use vendor snapshot score when the view is
 * for this day, without mixing readiness or inventing values.
 */
export function pickVendorSleepScoreForAnchorDay(
  view: SleepViewDto | undefined,
  anchorDay: string,
): number | null {
  if (!view) return null;
  if (view.isFallback) return null;
  if (!isOuraViewAlignedToDay(view, anchorDay)) return null;
  const raw = view.score;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return null;
  return Math.round(Math.min(100, raw));
}
