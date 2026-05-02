import type { RawEventListItem } from "@oli/contracts";
import { manualNutritionPayloadSchema } from "@oli/contracts";

export type NutritionRecentMealRow = {
  id: string;
  title: string;
  subtitle: string;
  kcalLabel: string | null;
};

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mealSlotLabel(slot: string | undefined): string {
  if (!slot) return "";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

/**
 * Meal rows for a single calendar day from raw nutrition events (payload includes foodLabel, macros).
 * Newest first, capped for overview.
 */
export function buildNutritionRecentMealRowsFromRaw(
  items: readonly RawEventListItem[],
  limit = 3,
): readonly NutritionRecentMealRow[] {
  const out: { row: NutritionRecentMealRow; t: number }[] = [];
  for (const r of items) {
    if (r.kind !== "nutrition" || r.payload == null) continue;
    const parsed = manualNutritionPayloadSchema.safeParse(r.payload);
    if (!parsed.success) continue;
    const pl = parsed.data;
    const t = Date.parse(r.observedAt);
    if (!Number.isFinite(t)) continue;

    const food = pl.foodLabel?.trim();
    const title =
      food && food.length > 0
        ? food
        : pl.logScope === "day_aggregate"
          ? "Quick add"
          : "Nutrition";

    const slot = mealSlotLabel(pl.mealSlot);
    const time = formatTimeShort(r.observedAt);
    const subtitle = [slot, time].filter((x) => x.length > 0).join(" · ") || time || "Logged";

    out.push({
      row: {
        id: r.id,
        title,
        subtitle,
        kcalLabel: `${Math.round(pl.totalKcal)} kcal`,
      },
      t,
    });
  }
  out.sort((a, b) => b.t - a.t);
  return out.slice(0, Math.max(0, limit)).map((x) => x.row);
}
