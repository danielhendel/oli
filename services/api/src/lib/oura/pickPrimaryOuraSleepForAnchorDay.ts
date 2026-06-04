/**
 * Choose one Oura sleep period per anchor day for sleepNights writes.
 * Prevents Firestore merge:last-write from letting short `sleep` periods clobber `long_sleep`.
 */

import { coerceOuraSleepScore0to100 } from "./buildSleepNightFromOuraDocument";
import { resolveOuraSleepIngestBase, type OuraSleepWindowDocument } from "./resolveOuraSleepIngestBase";

const TYPE_RANK: Record<string, number> = {
  long_sleep: 4,
  sleep: 2,
  late_nap: 1,
  early_nap: 1,
  rest: 0,
};

/** Higher rank = more likely to represent the nightly sleep card. */
export function ouraSleepTypeRank(type: unknown): number {
  if (typeof type !== "string") return 0;
  return TYPE_RANK[type] ?? 0;
}

/**
 * Compare primary sleep quality (a vs b). Positive when `a` should win over `b`.
 */
export function compareOuraSleepPrimaryQuality(
  a: OuraSleepWindowDocument,
  b: OuraSleepWindowDocument,
): number {
  const rankA = ouraSleepTypeRank(a.type);
  const rankB = ouraSleepTypeRank(b.type);
  if (rankA !== rankB) return rankA - rankB;

  const durA = typeof a.total_sleep_duration === "number" ? a.total_sleep_duration : 0;
  const durB = typeof b.total_sleep_duration === "number" ? b.total_sleep_duration : 0;
  if (durA !== durB) return durA - durB;

  const scoreA =
    coerceOuraSleepScore0to100(
      (a as { score?: unknown }).score ?? (a as { composite_score?: unknown }).composite_score,
    ) ?? -1;
  const scoreB =
    coerceOuraSleepScore0to100(
      (b as { score?: unknown }).score ?? (b as { composite_score?: unknown }).composite_score,
    ) ?? -1;
  return scoreA - scoreB;
}

export function pickPrimaryOuraSleepDocument(
  docs: readonly OuraSleepWindowDocument[],
): OuraSleepWindowDocument | null {
  let best: OuraSleepWindowDocument | null = null;
  for (const doc of docs) {
    if (!resolveOuraSleepIngestBase(doc)) continue;
    if (best == null || compareOuraSleepPrimaryQuality(doc, best) > 0) {
      best = doc;
    }
  }
  return best;
}

/**
 * One pair per anchor day — the period that should populate `sleepNights/{anchorDay}`.
 */
export function pickPrimaryOuraSleepPairs<
  T extends { doc: OuraSleepWindowDocument; snapshot: { id: string; day?: string } },
>(pairs: readonly T[]): T[] {
  const byAnchor = new Map<string, T[]>();
  for (const pair of pairs) {
    const resolved = resolveOuraSleepIngestBase(pair.doc);
    if (!resolved) continue;
    const anchor = resolved.rollupDay;
    const list = byAnchor.get(anchor) ?? [];
    list.push(pair);
    byAnchor.set(anchor, list);
  }

  const winners: T[] = [];
  for (const group of byAnchor.values()) {
    let best = group[0]!;
    for (let i = 1; i < group.length; i++) {
      const cur = group[i]!;
      if (compareOuraSleepPrimaryQuality(cur.doc, best.doc) > 0) {
        best = cur;
      }
    }
    winners.push(best);
  }
  return winners;
}
