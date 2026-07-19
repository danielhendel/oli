// lib/ui/timeline/formatTimelineDaySectionHeading.ts
// Pure local-day labels for Timeline day section headers (fallback + feed).
import type { DayKey } from "@/lib/ui/calendar/types";

export type TimelineDaySectionHeading = {
  /** Single centered visible line, e.g. `Today July 16, 2026` or `Wed July 15, 2026`. */
  visibleLabel: string;
  /** One coherent spoken label for accessibility. */
  accessibilityLabel: string;
};

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_LONG_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Format a Timeline day-section heading from calendar day keys.
 * Uses the UTC-noon day-key anchor (never bare Date parsing of YYYY-MM-DD alone).
 */
export function formatTimelineDaySectionHeading(args: {
  dayKey: string;
  todayDayKey: string;
  locale?: string;
}): TimelineDaySectionHeading {
  const dayKey = YYYY_MM_DD.test(args.dayKey) ? (args.dayKey as DayKey) : null;
  const todayDayKey = YYYY_MM_DD.test(args.todayDayKey)
    ? (args.todayDayKey as DayKey)
    : null;

  if (!dayKey || !todayDayKey) {
    const fallback = args.dayKey || "Unknown day";
    return {
      visibleLabel: fallback,
      accessibilityLabel: fallback,
    };
  }

  const locale = args.locale;
  const absoluteDateLabel = formatAbsoluteMonthDayYear(dayKey, locale);

  if (dayKey === todayDayKey) {
    return {
      visibleLabel: `Today ${absoluteDateLabel}`,
      accessibilityLabel: `Today, ${absoluteDateLabel}`,
    };
  }

  const weekdayShort = formatWeekdayShort(dayKey, locale);
  const weekdayLong = formatWeekdayLong(dayKey, locale);
  return {
    visibleLabel: `${weekdayShort} ${absoluteDateLabel}`,
    accessibilityLabel: `${weekdayLong}, ${absoluteDateLabel}`,
  };
}

function formatWeekdayShort(dayKey: DayKey, locale: string | undefined): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  try {
    const formatted = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      timeZone: "UTC",
    }).format(d);
    // Strip trailing punctuation some locales append (e.g. "Wed.").
    const cleaned = formatted.replace(/\.$/, "");
    if (cleaned.length > 0) return cleaned;
  } catch {
    // fall through
  }
  return WEEKDAY_SHORT_EN[d.getUTCDay()] ?? dayKey;
}

function formatWeekdayLong(dayKey: DayKey, locale: string | undefined): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  try {
    const formatted = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }).format(d);
    if (formatted.length > 0) return formatted;
  } catch {
    // fall through
  }
  return WEEKDAY_LONG_EN[d.getUTCDay()] ?? dayKey;
}

function formatAbsoluteMonthDayYear(dayKey: DayKey, locale: string | undefined): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return dayKey;
  try {
    return d.toLocaleDateString(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dayKey;
  }
}
