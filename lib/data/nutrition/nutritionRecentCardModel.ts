import type { CanonicalEventListItem } from "@oli/contracts";

export type NutritionRecentEntry = {
  id: string;
  dayKey: string;
  title: string;
  metaLine: string;
};

export type NutritionRecentCardModel = {
  entries: readonly NutritionRecentEntry[];
};

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Recent nutrition canonical events, newest first, capped for overview card.
 */
export function buildNutritionRecentCardModel(
  items: readonly CanonicalEventListItem[],
  limit = 7,
): NutritionRecentCardModel {
  const nutritionOnly = items.filter((e) => e.kind === "nutrition");
  const sorted = [...nutritionOnly].sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  const slice = sorted.slice(0, Math.max(0, limit));

  const entries: NutritionRecentEntry[] = slice.map((e) => ({
    id: e.id,
    dayKey: e.day,
    title: "Nutrition",
    metaLine: formatTimeShort(e.start) || "Logged",
  }));

  return { entries };
}
