// Selected-day canonical events page loader for Daily Timeline v1.
import { getEvents } from "@/lib/api/usersMe";
import type { GetOptions } from "@/lib/api/http";
import type { CanonicalEventListItem } from "@oli/contracts";
import {
  collectCursorPages,
  type CollectCursorPagesResult,
} from "@/lib/features/timeline/collectCursorPages";
import {
  TIMELINE_DAY_EVENTS_PAGE_SIZE,
  TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
} from "@/lib/features/timeline/timelineDayPageLimits";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

export type FetchTimelineDayEventsPagesArgs = {
  day: string;
  idToken: string;
  opts?: GetOptions;
  isCancelled?: () => boolean;
};

export type TimelineDayEventsPagesResult = CollectCursorPagesResult<CanonicalEventListItem>;

/**
 * Follows GET /users/me/events cursors for one calendar day only.
 * Does not widen the day window. Does not call timeline-feed.
 */
export async function fetchTimelineDayEventsPages(
  args: FetchTimelineDayEventsPagesArgs,
): Promise<TimelineDayEventsPagesResult> {
  const start = `${args.day}T00:00:00.000Z`;
  const end = `${args.day}T23:59:59.999Z`;

  return collectCursorPages<CanonicalEventListItem>({
    maxPages: TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
    getItemId: (item) => item.id,
    ...(args.isCancelled ? { isCancelled: args.isCancelled } : {}),
    fetchPage: async ({ cursor }) => {
      const res = await getEvents(args.idToken, {
        start,
        end,
        limit: TIMELINE_DAY_EVENTS_PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
        ...args.opts,
      });
      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        return {
          ok: true,
          items: outcome.data.items,
          nextCursor: outcome.data.nextCursor,
        };
      }
      if (outcome.status === "missing") {
        return { ok: true, items: [], nextCursor: null };
      }
      return {
        ok: false,
        kind: outcome.reason === "contract" ? "validation" : "network",
      };
    },
  });
}
