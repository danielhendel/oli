// lib/events/manualNutrition.ts
/**
 * Manual nutrition daily totals — matches {@link manualNutritionPayloadSchema} in rawEvent contract.
 * Window: local calendar day [start, end] in IANA timezone (UTC ISO instants).
 */

import { addCalendarDaysToDayKey } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";
import type { MealSlot } from "@/lib/nutrition/mealSlot";

export type NutritionLogScope = "day_aggregate" | "meal";

export type NutritionIngestSource = "manual" | "search" | "barcode";

export type ManualNutritionPayload = {
  start: string;
  end: string;
  timezone: string;
  day?: string;
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
  /** When `meal`, daily rollups count meals and first/last anchors (see aggregateDailyFacts). */
  logScope?: NutritionLogScope;
  nutritionIngestSource?: NutritionIngestSource;
  externalFoodId?: string;
  foodLabel?: string;
  /** Raw-only vendor/catalog JSON; never copied into canonical events. */
  providerResponse?: Record<string, unknown>;
  sugarG?: number | null;
  sodiumMg?: number | null;
  potassiumMg?: number | null;
  /** Oli fingerprint for dedupe / UX; raw-only vendor blobs stay in providerResponse. */
  foodHash?: string;
  /** Optional meal occasion (tracked meals). */
  mealSlot?: MealSlot;
};

export function getDeviceIanaTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

function ymdInTimeZone(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * First UTC instant where the user's local calendar reads `dayKey` in `timeZone`.
 */
export function utcInstantForLocalCalendarDayStart(dayKey: DayKey, timeZone: string): number {
  const parts = dayKey.split("-");
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const da = Number(parts[2]);
  if (!y || !mo || !da) throw new Error("Invalid dayKey");

  const fmt = (ms: number) => ymdInTimeZone(ms, timeZone);

  let found: number | null = null;
  for (let h = -48; h <= 48; h += 1) {
    const cand = Date.UTC(y, mo - 1, da, 12 + h, 0, 0, 0);
    if (fmt(cand) === dayKey) {
      found = cand;
      break;
    }
  }
  if (found == null) {
    throw new Error(`Could not resolve local calendar day ${dayKey} in ${timeZone}`);
  }

  let start = found;
  const coarse = 60_000;
  for (let i = 0; i < 2000; i += 1) {
    const prev = start - coarse;
    if (fmt(prev) !== dayKey) break;
    start = prev;
  }
  while (start > 0 && fmt(start - 1) === dayKey) start -= 1;
  return start;
}

export function localNutritionDayWindowIsoUtc(dayKey: DayKey, timeZone: string): { start: string; end: string } {
  const startMs = utcInstantForLocalCalendarDayStart(dayKey, timeZone);
  const nextDay = addCalendarDaysToDayKey(dayKey, 1);
  const nextStartMs = utcInstantForLocalCalendarDayStart(nextDay, timeZone);
  const endMs = nextStartMs - 1;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ManualNutritionInput = {
  dayKey: DayKey;
  timeZone: string;
  totalKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number | null;
};

export function buildManualNutritionPayload(input: ManualNutritionInput): ManualNutritionPayload {
  const { start, end } = localNutritionDayWindowIsoUtc(input.dayKey, input.timeZone);
  const payload: ManualNutritionPayload = {
    start,
    end,
    timezone: input.timeZone,
    day: input.dayKey,
    totalKcal: round2(input.totalKcal),
    proteinG: round2(input.proteinG),
    carbsG: round2(input.carbsG),
    fatG: round2(input.fatG),
  };
  if (input.fiberG !== undefined && input.fiberG !== null && Number.isFinite(input.fiberG)) {
    payload.fiberG = round2(input.fiberG);
  }
  return payload;
}

function hashString32(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909) >>> 0;
  return (h1.toString(16) + h2.toString(16)).slice(0, 32);
}

export function manualNutritionIdempotencyKey(payload: ManualNutritionPayload): string {
  const canonical = JSON.stringify(payload);
  const hash = hashString32(canonical);
  return `mn_${payload.start}_${hash}`.replace(/[^\w.-]/g, "_");
}
