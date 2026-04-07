import { formatDayKeyWeekdayShortMonthDay } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import type { DayKey } from "@/lib/ui/calendar/types";

export function formatBodyDayLabel(dayKey: string): string {
  return formatDayKeyWeekdayShortMonthDay(dayKey as DayKey);
}
