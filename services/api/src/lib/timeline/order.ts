/**
 * Pure Timeline feed ordering, comparison, and day helpers.
 */

import {
  TIMELINE_FEED_KIND_PRIORITY,
  timelineFeedKindPriority,
  type TimelinePresentationItem,
  type TimelinePresentationKind,
} from "@oli/contracts";

import type { TimelineFeedCursorPayload } from "./cursor";

export function dayMinusUtc(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const DISPLAY_ROLE_RANK: Record<TimelinePresentationItem["displayRole"], number> = {
  day_context: 0,
  chronological_event: 1,
  live_marker: 1,
  reminder: 2,
  recommendation: 2,
};

export function compareTimelineFeedItems(
  a: Pick<TimelinePresentationItem, "occurredAt" | "kind" | "id" | "displayRole">,
  b: Pick<TimelinePresentationItem, "occurredAt" | "kind" | "id" | "displayRole">,
): number {
  const ra = DISPLAY_ROLE_RANK[a.displayRole] ?? 1;
  const rb = DISPLAY_ROLE_RANK[b.displayRole] ?? 1;
  if (ra !== rb) return ra - rb;

  // Within day_context: sleep then recovery via kind priority (not wake timestamp).
  if (ra === 0) {
    const pa = timelineFeedKindPriority(a.kind);
    const pb = timelineFeedKindPriority(b.kind);
    if (pa !== pb) return pa - pb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }

  const ta = Date.parse(a.occurredAt);
  const tb = Date.parse(b.occurredAt);
  const va = Number.isFinite(ta) ? ta : Number.POSITIVE_INFINITY;
  const vb = Number.isFinite(tb) ? tb : Number.POSITIVE_INFINITY;
  if (va !== vb) return va - vb;
  const pa = timelineFeedKindPriority(a.kind);
  const pb = timelineFeedKindPriority(b.kind);
  if (pa !== pb) return pa - pb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortTimelineFeedItems(
  items: readonly TimelinePresentationItem[],
): TimelinePresentationItem[] {
  return [...items].sort(compareTimelineFeedItems);
}

/**
 * True when `item` sorts strictly after the cursor position.
 * Reconstructs a synthetic prior item from the opaque cursor fields so
 * displayRole / kind-priority ordering matches page assembly.
 */
export function isAfterTimelineFeedCursor(
  item: TimelinePresentationItem,
  cursor: TimelineFeedCursorPayload,
): boolean {
  const cursorKind = kindFromPriority(cursor.kindPriority);
  const cursorItem: Pick<TimelinePresentationItem, "occurredAt" | "kind" | "id" | "displayRole"> = {
    occurredAt: cursor.occurredAt,
    kind: cursorKind,
    id: cursor.id,
    displayRole: displayRoleForKind(cursorKind),
  };
  return compareTimelineFeedItems(item, cursorItem) > 0;
}

function kindFromPriority(priority: number): TimelinePresentationKind {
  const entries = Object.entries(TIMELINE_FEED_KIND_PRIORITY) as [
    TimelinePresentationKind,
    number,
  ][];
  const hit = entries.find(([, p]) => p === priority);
  return hit?.[0] ?? "nutrition";
}

function displayRoleForKind(kind: TimelinePresentationKind): TimelinePresentationItem["displayRole"] {
  if (kind === "sleep_context" || kind === "recovery_context") return "day_context";
  if (kind === "activity_live") return "live_marker";
  return "chronological_event";
}

export function cursorPayloadFromItem(item: TimelinePresentationItem): TimelineFeedCursorPayload {
  return {
    day: item.day,
    occurredAt: item.occurredAt,
    kindPriority: timelineFeedKindPriority(item.kind as TimelinePresentationKind),
    id: item.id,
  };
}
