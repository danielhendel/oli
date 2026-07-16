/**
 * Dedupe Timeline presentation items by hierarchy:
 * (1) id (2) dedupeKey — title+time alone is forbidden.
 */

import type { TimelinePresentationItem } from "@oli/contracts";

export function dedupeTimelineFeedItems(
  items: readonly TimelinePresentationItem[],
): TimelinePresentationItem[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const out: TimelinePresentationItem[] = [];
  for (const item of items) {
    if (seenIds.has(item.id)) continue;
    if (seenKeys.has(item.dedupeKey)) continue;
    seenIds.add(item.id);
    seenKeys.add(item.dedupeKey);
    out.push(item);
  }
  return out;
}
