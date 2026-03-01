import type { ExerciseCatalogItem } from "./catalog";

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreItem(q: string, item: ExerciseCatalogItem): number {
  const name = norm(item.name);
  const id = norm(item.exerciseId.replace(/_/g, " "));
  const aliases = item.aliases.map(norm);

  if (q === "") return 0;
  if (q === name) return 100;
  if (q === id) return 95;
  if (aliases.includes(q)) return 90;
  if (name.startsWith(q)) return 80;
  if (id.startsWith(q)) return 75;
  if (aliases.some((a) => a.startsWith(q))) return 70;
  if (name.includes(q)) return 60;
  if (id.includes(q)) return 55;
  if (aliases.some((a) => a.includes(q))) return 50;
  return 0;
}

/**
 * Deterministic search for exercise catalog.
 * - Pure function
 * - Stable sorting (score desc, then name asc, then exerciseId asc)
 */
export function searchExercises(
  catalog: ExerciseCatalogItem[],
  query: string,
  limit = 12,
): ExerciseCatalogItem[] {
  const q = norm(query);
  if (q === "") return [];

  const scored = catalog
    .map((item) => ({ item, score: scoreItem(q, item) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const an = a.item.name.localeCompare(b.item.name);
      if (an !== 0) return an;
      return a.item.exerciseId.localeCompare(b.item.exerciseId);
    })
    .map((x) => x.item);

  return scored.slice(0, Math.max(0, limit));
}
