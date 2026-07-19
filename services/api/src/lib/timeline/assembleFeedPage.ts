/**
 * Assemble one bounded Timeline feed page (items, not days).
 * Walks days from anchor (or cursor day) backwards until limit is satisfied.
 */

import {
  timelineFeedResponseDtoSchema,
  type TimelineFeedResponseDto,
  type TimelinePresentationItem,
} from "@oli/contracts";

import { decodeTimelineFeedCursor, encodeTimelineFeedCursor } from "./cursor";
import { loadTimelineDaySources } from "./loadDaySources";
import { normalizeTimelineDay } from "./normalizeDay";
import {
  cursorPayloadFromItem,
  dayMinusUtc,
  isAfterTimelineFeedCursor,
} from "./order";

/** Hard cap on calendar days scanned per request (busy-history safety). */
export const TIMELINE_FEED_MAX_DAYS_SCANNED = 30;

export type AssembleTimelineFeedPageInput = {
  uid: string;
  /** Client device today / jump target. Defaults to UTC today when omitted by route. */
  anchorDay: string;
  cursor?: string;
  limit: number;
  nowIso?: string;
};

export type AssembleTimelineFeedPageResult =
  | { ok: true; data: TimelineFeedResponseDto }
  | { ok: false; code: "INVALID_CURSOR" | "ASSEMBLY_FAILED"; message: string };

export async function assembleTimelineFeedPage(
  input: AssembleTimelineFeedPageInput,
): Promise<AssembleTimelineFeedPageResult> {
  const limit = input.limit;
  const nowIso = input.nowIso ?? new Date().toISOString();
  const todayDay = input.anchorDay;

  let startDay = input.anchorDay;
  let cursorPayload = null as ReturnType<typeof decodeTimelineFeedCursor>;

  if (input.cursor) {
    cursorPayload = decodeTimelineFeedCursor(input.cursor);
    if (!cursorPayload) {
      return { ok: false, code: "INVALID_CURSOR", message: "Invalid cursor" };
    }
    startDay = cursorPayload.day;
  }

  const collected: TimelinePresentationItem[] = [];
  let daysScanned = 0;
  let currentDay = startDay;

  while (collected.length < limit + 1 && daysScanned < TIMELINE_FEED_MAX_DAYS_SCANNED) {
    daysScanned += 1;
    const sources = await loadTimelineDaySources(input.uid, currentDay);
    let dayItems = normalizeTimelineDay({
      day: currentDay,
      todayDay,
      nowIso,
      events: sources.events,
      rawItems: sources.rawItems,
      sleepNight: sources.sleepNight,
      bedtimeNights: sources.bedtimeNights,
      readiness: sources.readiness ?? null,
      dailyFacts: sources.dailyFacts,
      insights: sources.insights,
    });

    if (cursorPayload && currentDay === cursorPayload.day) {
      dayItems = dayItems.filter((item) => isAfterTimelineFeedCursor(item, cursorPayload!));
    } else if (cursorPayload && currentDay > cursorPayload.day) {
      dayItems = [];
    }

    for (const item of dayItems) {
      collected.push(item);
      if (collected.length >= limit + 1) break;
    }

    currentDay = dayMinusUtc(currentDay, 1);
  }

  const hasMore = collected.length > limit;
  const pageItems = hasMore ? collected.slice(0, limit) : collected;
  const last = pageItems[pageItems.length - 1];
  const nextCursor =
    hasMore && last ? encodeTimelineFeedCursor(cursorPayloadFromItem(last)) : null;

  const sections: string[] = [];
  const seen = new Set<string>();
  for (const item of pageItems) {
    if (!seen.has(item.day)) {
      seen.add(item.day);
      sections.push(item.day);
    }
  }

  const validated = timelineFeedResponseDtoSchema.safeParse({
    items: pageItems,
    sections,
    nextCursor,
    hasMore: hasMore && nextCursor != null,
  });

  if (!validated.success) {
    return {
      ok: false,
      code: "ASSEMBLY_FAILED",
      message: "Feed assembly failed validation",
    };
  }

  return { ok: true, data: validated.data };
}
