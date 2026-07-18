// Selected-day raw nutrition/incomplete page loader for Daily Timeline v1.
import { getRawEvents } from "@/lib/api/usersMe";
import type { GetOptions } from "@/lib/api/http";
import type { RawEventListItem } from "@oli/contracts";
import {
  collectCursorPages,
  type CollectCursorPagesResult,
} from "@/lib/features/timeline/collectCursorPages";
import {
  TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
  TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE,
} from "@/lib/features/timeline/timelineDayPageLimits";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";

export const TIMELINE_DAY_RAW_KINDS = ["nutrition", "incomplete"] as const;

export type FetchTimelineDayRawEventsPagesArgs = {
  day: string;
  idToken: string;
  opts?: GetOptions;
  isCancelled?: () => boolean;
};

export type TimelineDayRawEventsPagesResult = CollectCursorPagesResult<RawEventListItem>;

/**
 * Follows GET /users/me/raw-events cursors for one calendar day only.
 * includePayload is hydrate-only for VM normalization; callers must not pass payload to UI.
 */
export async function fetchTimelineDayRawEventsPages(
  args: FetchTimelineDayRawEventsPagesArgs,
): Promise<TimelineDayRawEventsPagesResult> {
  return collectCursorPages<RawEventListItem>({
    maxPages: TIMELINE_DAY_MAX_PAGES_PER_FAMILY,
    getItemId: (item) => item.id,
    ...(args.isCancelled ? { isCancelled: args.isCancelled } : {}),
    fetchPage: async ({ cursor }) => {
      const res = await getRawEvents(args.idToken, {
        start: args.day,
        end: args.day,
        kinds: [...TIMELINE_DAY_RAW_KINDS],
        includePayload: true,
        limit: TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE,
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
