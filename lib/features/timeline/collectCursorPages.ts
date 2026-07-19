// Pure bounded cursor-page collector for Daily Timeline selected-day reads.
// No React, no UI, no logging of cursors/IDs/payloads.

export type CursorPageFetchFailureKind = "network" | "validation";

export type CursorPageFetchResult<TItem> =
  | { ok: true; items: readonly TItem[]; nextCursor: string | null }
  | { ok: false; kind: CursorPageFetchFailureKind };

export type CursorPageIncompletenessReason =
  | "page_cap"
  | "cursor_cycle"
  | "continuation_error"
  | "validation_error";

export type CollectCursorPagesResult<TItem> =
  | {
      completeness: "complete";
      items: readonly TItem[];
      pageCount: number;
      requestCount: number;
    }
  | {
      completeness: "partial";
      items: readonly TItem[];
      pageCount: number;
      requestCount: number;
      reason: CursorPageIncompletenessReason;
    }
  | {
      completeness: "error";
      items: readonly [];
      pageCount: 0;
      requestCount: number;
      reason: "continuation_error" | "validation_error";
    };

export type CollectCursorPagesArgs<TItem> = {
  maxPages: number;
  getItemId: (item: TItem) => string;
  fetchPage: (args: {
    cursor: string | null;
  }) => Promise<CursorPageFetchResult<TItem>>;
  isCancelled?: () => boolean;
};

const INITIAL_CURSOR_SENTINEL = "";

/**
 * Collect cursor pages until nextCursor is null, a safety bound trips, or cancel.
 * Preserves first-seen API order; dedupes by stable id at page boundaries.
 */
export async function collectCursorPages<TItem>(
  args: CollectCursorPagesArgs<TItem>,
): Promise<CollectCursorPagesResult<TItem>> {
  const maxPages = Math.max(1, Math.floor(args.maxPages));
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  const items: TItem[] = [];
  let cursor: string | null = null;
  let pageCount = 0;
  let requestCount = 0;

  while (pageCount < maxPages) {
    if (args.isCancelled?.()) {
      return {
        completeness: items.length > 0 ? "partial" : "error",
        items: items.length > 0 ? items : [],
        pageCount,
        requestCount,
        reason: "continuation_error",
      } as CollectCursorPagesResult<TItem>;
    }

    const cursorKey = cursor ?? INITIAL_CURSOR_SENTINEL;
    if (seenCursors.has(cursorKey)) {
      return {
        completeness: "partial",
        items,
        pageCount,
        requestCount,
        reason: "cursor_cycle",
      };
    }
    seenCursors.add(cursorKey);

    requestCount += 1;
    const page = await args.fetchPage({ cursor });

    if (!page.ok) {
      if (args.isCancelled?.()) {
        return {
          completeness: items.length > 0 ? "partial" : "error",
          items: items.length > 0 ? items : [],
          pageCount,
          requestCount,
          reason: "continuation_error",
        } as CollectCursorPagesResult<TItem>;
      }
      const reason: CursorPageIncompletenessReason =
        page.kind === "validation" ? "validation_error" : "continuation_error";
      if (items.length === 0) {
        return {
          completeness: "error",
          items: [],
          pageCount: 0,
          requestCount,
          reason,
        };
      }
      return {
        completeness: "partial",
        items,
        pageCount,
        requestCount,
        reason,
      };
    }

    pageCount += 1;
    for (const item of page.items) {
      const id = args.getItemId(item);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      items.push(item);
    }

    if (args.isCancelled?.()) {
      return {
        completeness: "partial",
        items,
        pageCount,
        requestCount,
        reason: "continuation_error",
      };
    }

    if (page.nextCursor == null) {
      return {
        completeness: "complete",
        items,
        pageCount,
        requestCount,
      };
    }

    if (seenCursors.has(page.nextCursor)) {
      return {
        completeness: "partial",
        items,
        pageCount,
        requestCount,
        reason: "cursor_cycle",
      };
    }

    cursor = page.nextCursor;
  }

  // Cap reached while a next page remains (we stop before requesting page maxPages+1).
  return {
    completeness: "partial",
    items,
    pageCount,
    requestCount,
    reason: "page_cap",
  };
}

/** Ready-state invariant: complete collection must not retain an unresolved cursor. */
export function assertCursorCollectionReady(
  result: CollectCursorPagesResult<unknown>,
): void {
  if (result.completeness === "complete") return;
  throw new Error("Timeline day history completeness unproven");
}
