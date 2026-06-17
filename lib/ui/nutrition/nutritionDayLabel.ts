import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

/**
 * Human-friendly label for a `YYYY-MM-DD` day key.
 * Returns "Today" when the key matches the local calendar day, otherwise a
 * locale weekday/month/day string (e.g. "Sun, Mar 15"). Falls back to the raw
 * key for unparseable input.
 */
export function nutritionDayLabel(dayKey: string, today: string = getTodayDayKeyLocal()): string {
  if (dayKey === today) return "Today";
  const d = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dayKey;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
