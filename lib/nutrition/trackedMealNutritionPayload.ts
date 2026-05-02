import type { ManualNutritionPayload, NutritionIngestSource } from "@/lib/events/manualNutrition";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";
import type { DayKey } from "@/lib/ui/calendar/types";
import { computeFoodHash } from "@/lib/nutrition/normalizeFoodName";
import type { MealSlot } from "@/lib/nutrition/mealSlot";

export type { NutritionIngestSource } from "@/lib/events/manualNutrition";

export type BuildTrackedMealNutritionPayloadInput = {
  dayKey: DayKey;
  timeZone: string;
  /** ISO instant when the user ate the food (meal anchor). */
  observedAtIso: string;
  food: NutritionFoodSearchItemDto;
  /** Multiplier vs catalog serving (1 = default serving). */
  servingMultiplier: number;
  nutritionIngestSource: NutritionIngestSource;
  /** Original provider/catalog JSON stored only on RawEvent. */
  providerResponse: Record<string, unknown>;
  /** Eating occasion (optional). */
  mealSlot?: MealSlot;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

function clampPositive(m: number): number {
  if (!Number.isFinite(m) || m <= 0) return 1;
  return Math.min(m, 24);
}

function mealWindowIso(observedAtIso: string): { start: string; end: string } {
  const t = Date.parse(observedAtIso);
  if (Number.isNaN(t)) {
    const now = new Date().toISOString();
    const endMs = Date.parse(now) + 1000;
    return { start: now, end: new Date(endMs).toISOString() };
  }
  const endMs = t + 1000;
  return { start: observedAtIso, end: new Date(endMs).toISOString() };
}

/**
 * Builds a manual nutrition RawEvent payload for a single tracked meal (per-meal window).
 * Vendor/catalog snapshot stays in `providerResponse` only.
 */
export function buildTrackedMealNutritionPayload(input: BuildTrackedMealNutritionPayloadInput): ManualNutritionPayload {
  const mult = clampPositive(input.servingMultiplier);
  const { start, end } = mealWindowIso(input.observedAtIso);
  const f = input.food;
  const foodHash =
    "foodHash" in f && typeof (f as { foodHash?: string }).foodHash === "string"
      ? (f as { foodHash: string }).foodHash
      : computeFoodHash({ name: f.name, brand: f.brand ?? null, externalFoodId: f.id });

  const payload: ManualNutritionPayload = {
    start,
    end,
    timezone: input.timeZone,
    day: input.dayKey,
    totalKcal: round2(f.caloriesKcal * mult),
    proteinG: round2(f.proteinG * mult),
    carbsG: round2(f.carbsG * mult),
    fatG: round2(f.fatG * mult),
    logScope: "meal",
    nutritionIngestSource: input.nutritionIngestSource,
    externalFoodId: f.id,
    foodLabel: f.brand?.trim() ? `${f.name} (${f.brand})` : f.name,
    providerResponse: input.providerResponse,
    foodHash,
  };
  if (f.fiberG !== undefined) {
    payload.fiberG = round2(f.fiberG * mult);
  }
  if (f.sugarG !== undefined) {
    payload.sugarG = round2(f.sugarG * mult);
  }
  if (f.sodiumMg !== undefined) {
    payload.sodiumMg = round2(f.sodiumMg * mult);
  }
  if (input.mealSlot !== undefined) {
    payload.mealSlot = input.mealSlot;
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

/**
 * Idempotent replay key for a tracked meal log (duplicate taps / retries).
 */
export function trackedMealNutritionIdempotencyKey(payload: ManualNutritionPayload): string {
  const keyObj = {
    start: payload.start,
    end: payload.end,
    tz: payload.timezone,
    day: payload.day ?? null,
    kcal: payload.totalKcal,
    p: payload.proteinG,
    c: payload.carbsG,
    f: payload.fatG,
    fi: payload.fiberG ?? null,
    su: payload.sugarG ?? null,
    so: payload.sodiumMg ?? null,
    scope: payload.logScope ?? null,
    src: payload.nutritionIngestSource ?? null,
    foodId: payload.externalFoodId ?? null,
    foodHash: payload.foodHash ?? null,
    mealSlot: payload.mealSlot ?? null,
  };
  const canonical = JSON.stringify(keyObj);
  const hash = hashString32(canonical);
  return `nm_${hash}`.replace(/[^\w.-]/g, "_");
}
