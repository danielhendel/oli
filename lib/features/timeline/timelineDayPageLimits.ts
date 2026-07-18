// Bounded selected-day pagination for Daily Timeline v1.
// Derived from API max page sizes and a hard ≤10 page cap (no silent truncation).

/** Canonical events page size (≤ API max 500; aligned with prior day client). */
export const TIMELINE_DAY_EVENTS_PAGE_SIZE = 100 as const;

/** Raw events page size (equals API max 100). */
export const TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE = 100 as const;

/** Hard cap on continuation pages per selected-day family (task bound ≤ 10). */
export const TIMELINE_DAY_MAX_PAGES_PER_FAMILY = 10 as const;

export const TIMELINE_DAY_EVENTS_MAX_ITEMS =
  TIMELINE_DAY_EVENTS_PAGE_SIZE * TIMELINE_DAY_MAX_PAGES_PER_FAMILY;

export const TIMELINE_DAY_RAW_EVENTS_MAX_ITEMS =
  TIMELINE_DAY_RAW_EVENTS_PAGE_SIZE * TIMELINE_DAY_MAX_PAGES_PER_FAMILY;

/**
 * Ordinary selected day (no nextCursor): 1 events + 1 raw + sleep + facts + insights.
 * Worst case with full continuation: 10 + 10 + 3 context reads.
 */
export const TIMELINE_DAY_ORDINARY_SELECTED_DAY_REQUESTS = 5 as const;
export const TIMELINE_DAY_WORST_CASE_SELECTED_DAY_REQUESTS =
  TIMELINE_DAY_MAX_PAGES_PER_FAMILY * 2 + 3;
