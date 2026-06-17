import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import type { MealSlot } from "@/lib/nutrition/mealSlot";
import type { DayKey } from "@/lib/ui/calendar/types";

/**
 * Edits a logged meal's time/occasion without changing its nutrition.
 *
 * Nutrition truth (macros) is preserved exactly; only the meal window (`start`/`end`)
 * and `mealSlot` change. The result is re-ingested via the existing tracked-meal POST
 * /ingest path (new idempotency key), then the original RawEvent is deleted.
 */
export function buildEditedNutritionPayload(
  original: ManualNutritionPayload,
  edit: { observedAtIso: string; mealSlot?: MealSlot },
): ManualNutritionPayload {
  const t = Date.parse(edit.observedAtIso);
  const valid = !Number.isNaN(t);
  const start = valid ? edit.observedAtIso : original.start;
  const end = valid ? new Date(t + 1000).toISOString() : original.end;

  const next: ManualNutritionPayload = { ...original, start, end };
  if (edit.mealSlot !== undefined) {
    next.mealSlot = edit.mealSlot;
  }
  return next;
}

/** 12-hour wheel selection (hour 1–12, minute 0–59, AM/PM). */
export type TimeWheelSelection = {
  hour12: number;
  minute: number;
  meridiem: "AM" | "PM";
};

export const TIME_WHEEL_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const TIME_WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => i);
export const TIME_WHEEL_MERIDIEM = ["AM", "PM"] as const;

/** Convert 24h fields to wheel columns. */
export function timeWheelFromFields(hours24: number, minutes: number): TimeWheelSelection {
  const meridiem: "AM" | "PM" = hours24 >= 12 ? "PM" : "AM";
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;
  const minute = Math.max(0, Math.min(59, Math.round(minutes)));
  return { hour12, minute, meridiem };
}

/** Convert wheel columns to 24h fields. */
export function timeFieldsFromWheel(sel: TimeWheelSelection): { hours24: number; minutes: number } {
  let hours = sel.hour12 % 12;
  if (sel.meridiem === "PM") hours += 12;
  return { hours24: hours, minutes: sel.minute };
}

/** Parses "2:22 PM", "14:22", "2:22pm" into 24h fields. Returns null when invalid. */
export function parseTimeOfDayInput(text: string): { hours24: number; minutes: number } | null {
  const trimmed = text.trim().toLowerCase();
  const m = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!m) return null;
  let hours = Number.parseInt(m[1]!, 10);
  const minutes = Number.parseInt(m[2]!, 10);
  const meridiem = m[3];
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
  } else if (hours < 0 || hours > 23) {
    return null;
  }
  return { hours24: hours, minutes };
}

/** Formats 24h fields to a 12h clock label, e.g. "2:22 PM". */
export function formatTimeOfDay(hours24: number, minutes: number): string {
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  let h = hours24 % 12;
  if (h === 0) h = 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

/** Local-time fields → ISO instant on the given calendar day (device timezone). */
export function timeOfDayToIsoOnDay(dayKey: DayKey, hours24: number, minutes: number): string {
  const [y, mo, d] = dayKey.split("-").map((p) => Number.parseInt(p, 10));
  const date = new Date(y!, (mo ?? 1) - 1, d ?? 1, hours24, minutes, 0, 0);
  return date.toISOString();
}

/** Extracts local-time fields from an ISO instant (device timezone). */
export function timeFieldsFromIso(iso: string): { hours24: number; minutes: number } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { hours24: 12, minutes: 0 };
  return { hours24: d.getHours(), minutes: d.getMinutes() };
}
