import type { RawEventListItem } from "@oli/contracts";
import { manualNutritionPayloadSchema } from "@oli/contracts";
import type { ManualNutritionPayload } from "@/lib/events/manualNutrition";
import type { MealSlot } from "@/lib/nutrition/mealSlot";
import { formatMealSlotDisplayLabel, isMealSlot } from "@/lib/nutrition/mealSlot";

export type NutritionDayMealEntry = {
  id: string;
  title: string;
  /** "Lunch" / "" when no slot. */
  mealLabel: string;
  /** "2:22 PM" local time. */
  timeLabel: string;
  /** "Lunch · 2:22 PM". */
  subtitle: string;
  kcalLabel: string;
  observedAt: string;
  mealSlot: MealSlot | null;
  /** Whether this row can be edited/deleted (manual-provider tracked meals). */
  editable: boolean;
  /** Parsed payload, reusable for delete + re-ingest (edit) flows. */
  payload: ManualNutritionPayload;
};

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function mealSlotLabel(slot: string | undefined): string {
  return formatMealSlotDisplayLabel(slot);
}

/**
 * Logged meal entries for a single calendar day from raw nutrition events.
 * Newest first. Each entry carries the parsed payload so the View Food edit
 * flow can re-ingest/delete without an extra fetch.
 */
export function buildNutritionDayMealEntries(
  items: readonly RawEventListItem[],
  limit = 100,
): readonly NutritionDayMealEntry[] {
  const out: { entry: NutritionDayMealEntry; t: number }[] = [];
  for (const r of items) {
    if (r.kind !== "nutrition" || r.payload == null) continue;
    const parsed = manualNutritionPayloadSchema.safeParse(r.payload);
    if (!parsed.success) continue;
    const pl = parsed.data;
    const t = Date.parse(r.observedAt);
    if (!Number.isFinite(t)) continue;

    const food = pl.foodLabel?.trim();
    const title =
      food && food.length > 0 ? food : pl.logScope === "day_aggregate" ? "Quick add" : "Nutrition";
    const slot = typeof pl.mealSlot === "string" && isMealSlot(pl.mealSlot) ? pl.mealSlot : null;
    const mealLabel = mealSlotLabel(pl.mealSlot);
    const timeLabel = formatTimeShort(r.observedAt);
    const subtitle = [mealLabel, timeLabel].filter((x) => x.length > 0).join(" · ") || timeLabel || "Logged";
    // Tracked meals (logScope "meal") created by the app are editable; legacy day
    // aggregates are not (they span the whole day, not a single eating occasion).
    const editable = pl.logScope !== "day_aggregate";

    out.push({
      entry: {
        id: r.id,
        title,
        mealLabel,
        timeLabel,
        subtitle,
        kcalLabel: `${Math.round(pl.totalKcal)} kcal`,
        observedAt: r.observedAt,
        mealSlot: slot,
        editable,
        payload: pl as ManualNutritionPayload,
      },
      t,
    });
  }
  out.sort((a, b) => b.t - a.t);
  return out.slice(0, Math.max(0, limit)).map((x) => x.entry);
}
