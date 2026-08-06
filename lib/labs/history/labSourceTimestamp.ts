/**
 * Lab source timestamp contract — collection-date authority for history.
 * Never shift calendar dates via device timezone.
 */

export type LabSourceTimestamp = {
  sourceRaw: string;
  sourceCalendarDate: string;
  precision: "date_time_with_timezone" | "date_time_without_timezone" | "date_only" | "unknown";
  instant: string | null;
  timezoneOffset: string | null;
  timezoneName: string | null;
};

export const LAB_SOURCE_TIMESTAMP_CONTRACT_VERSION = "1.0.0";

const CALENDAR_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const US_TZ_OFFSETS: Record<string, string> = {
  EST: "-05:00",
  EDT: "-04:00",
  CST: "-06:00",
  CDT: "-05:00",
  MST: "-07:00",
  MDT: "-06:00",
  PST: "-08:00",
  PDT: "-07:00",
  AKST: "-09:00",
  AKDT: "-08:00",
  HST: "-10:00",
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function calendarDateFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function mapTimezoneOffset(name: string | null): string | null {
  if (!name) return null;
  return US_TZ_OFFSETS[name.toUpperCase()] ?? null;
}

/**
 * Parse Quest collection/received/reported raw strings into a temporal contract.
 * Preserves source calendar fields — never applies device timezone.
 */
export function parseLabSourceTimestampFromQuestRaw(raw: string): LabSourceTimestamp | null {
  const sourceRaw = raw.trim();
  if (!sourceRaw) return null;

  const mdy =
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*\/?\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?(?:\s*([A-Z]{2,5}))?)?/i.exec(
      sourceRaw,
    );
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    const sourceCalendarDate = calendarDateFromParts(year, month, day);
    const hasTime = Boolean(mdy[4] && mdy[5]);
    if (!hasTime) {
      return {
        sourceRaw,
        sourceCalendarDate,
        precision: "date_only",
        instant: null,
        timezoneOffset: null,
        timezoneName: null,
      };
    }
    let hour = Number(mdy[4]);
    const minute = Number(mdy[5]);
    const ampm = mdy[6]?.toUpperCase();
    const timezoneName = mdy[7]?.toUpperCase() ?? null;
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const instant = new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
    return {
      sourceRaw,
      sourceCalendarDate,
      precision: timezoneName ? "date_time_with_timezone" : "date_time_without_timezone",
      instant,
      timezoneOffset: mapTimezoneOffset(timezoneName),
      timezoneName,
    };
  }

  const ymd = /(\d{4})-(\d{2})-(\d{2})/.exec(sourceRaw);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    return {
      sourceRaw,
      sourceCalendarDate: calendarDateFromParts(year, month, day),
      precision: "date_only",
      instant: null,
      timezoneOffset: null,
      timezoneName: null,
    };
  }

  return null;
}

/** ISO instant for legacy collectedAt fields — midnight UTC for date-only sources. */
export function labSourceTimestampToCollectedAtIso(ts: LabSourceTimestamp | null): string | null {
  if (!ts || ts.precision === "unknown" || !ts.sourceCalendarDate) return null;
  if (ts.instant) return ts.instant;
  if (ts.precision !== "date_only") return null;
  const m = CALENDAR_DATE_RE.exec(ts.sourceCalendarDate);
  if (!m) return null;
  return new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0),
  ).toISOString();
}

/** Format YYYY-MM-DD for display without Date timezone shift. */
export function formatLabCalendarDate(calendarDate: string): string {
  const m = CALENDAR_DATE_RE.exec(calendarDate);
  if (!m) return calendarDate;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return calendarDate;
  return `${MONTH_LABELS[month - 1]} ${day}, ${year}`;
}

export function isHistoryEligibleCollectionTimestamp(
  ts: LabSourceTimestamp | null | undefined,
): boolean {
  if (!ts) return false;
  if (ts.precision === "unknown") return false;
  if (!ts.sourceCalendarDate || !CALENDAR_DATE_RE.test(ts.sourceCalendarDate)) return false;
  return true;
}

export function historyTimestampFromAccepted(
  collectedAt: string | null,
  datePrecision: string | null | undefined,
  sourceCalendarDate?: string | null,
): { calendarDate: string | null; eligible: boolean } {
  if (!collectedAt) {
    return { calendarDate: null, eligible: false };
  }
  if (!datePrecision || datePrecision === "unknown") {
    return { calendarDate: null, eligible: false };
  }

  let calendarDate: string | null = null;
  if (sourceCalendarDate && CALENDAR_DATE_RE.test(sourceCalendarDate)) {
    calendarDate = sourceCalendarDate;
  } else {
    const isoPrefix = /^(\d{4}-\d{2}-\d{2})/.exec(collectedAt);
    calendarDate = isoPrefix?.[1] ?? null;
  }

  if (!calendarDate || !CALENDAR_DATE_RE.test(calendarDate)) {
    return { calendarDate: null, eligible: false };
  }

  return { calendarDate, eligible: true };
}
