/**
 * Strength Overview “This Week” row — workout title line only (UI fallback).
 */
export function strengthThisWeekRowTitle(displayTitle: string | undefined | null): string {
  const t = (displayTitle ?? "").trim();
  return t.length > 0 ? t : "Strength Training";
}
