/**
 * Per-kind GET /users/me/raw-events `limit` for Body overview peek (two parallel requests:
 * `weight` and `body_composition`). Each must be ≤ `rawEventsListQuerySchema` max (100).
 *
 * We use two single-kind queries (same shape as `useWeightSeries`) instead of one
 * `kinds=weight,body_composition` request to avoid INVALID_QUERY / infra edge cases on
 * multi-kind filters while keeping total fetch bounded (~2× this limit).
 */
export const BODY_OVERVIEW_PEEK_PER_KIND_LIMIT = 50;

/**
 * Per-kind limit for the narrow `[snapshotDay, snapshotDay+1]` raw-events fetch used to load
 * same-day body_composition rows that may fall outside the global newest-first peek page.
 */
export const BODY_SNAPSHOT_DAY_PEEK_PER_KIND_LIMIT = 100;
