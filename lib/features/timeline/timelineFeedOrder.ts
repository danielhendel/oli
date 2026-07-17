/**
 * Pure Timeline continuous-feed ordering helpers.
 * Server pages remain day-descending (anchor/newest first) for the opaque cursor contract.
 * Display sections are derived ascending (oldest → newest) so Today sits at the bottom.
 */

import type { TimelinePresentationItem } from "@oli/contracts";

export type TimelineFeedSection = {
  day: string;
  data: TimelinePresentationItem[];
};

/** Append a newer older-history page while dropping duplicate dedupeKeys. */
export function mergeFeedPageItems(
  prev: readonly TimelinePresentationItem[],
  next: readonly TimelinePresentationItem[],
): TimelinePresentationItem[] {
  const seen = new Set(prev.map((i) => i.dedupeKey));
  const out = [...prev];
  for (const item of next) {
    if (seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    out.push(item);
  }
  return out;
}

/**
 * Group items into day sections ordered oldest → newest.
 * Within each day, preserve first-seen item order (server within-day ascending).
 */
export function groupSectionsAscending(
  items: readonly TimelinePresentationItem[],
): TimelineFeedSection[] {
  const map = new Map<string, TimelinePresentationItem[]>();
  for (const item of items) {
    const bucket = map.get(item.day);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(item.day, [item]);
    }
  }
  const days = [...map.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return days.map((day) => ({ day, data: map.get(day)! }));
}

/** Index of the final/current (newest) section — target for cold open and Return to Today. */
export function finalSectionIndex(sections: readonly TimelineFeedSection[]): number {
  return Math.max(0, sections.length - 1);
}

export function finalSectionDay(sections: readonly TimelineFeedSection[]): string | null {
  if (sections.length === 0) return null;
  return sections[sections.length - 1]!.day;
}

export type OlderPageRequestGate = {
  hasMore: boolean;
  nextCursor: string | null;
  loadingMore: boolean;
  loading: boolean;
};

/** True when one older cursor page may be requested (top-boundary only). */
export function canRequestOlderPage(gate: OlderPageRequestGate): boolean {
  return gate.hasMore && gate.nextCursor != null && !gate.loadingMore && !gate.loading;
}

/**
 * Decide whether a SectionList edge callback may request older history.
 * Older history loads at the top only — never from the bottom/end edge.
 */
export function shouldLoadOlderFromEdge(args: {
  edge: "start" | "end";
  gate: OlderPageRequestGate;
}): boolean {
  if (args.edge !== "start") return false;
  return canRequestOlderPage(args.gate);
}
