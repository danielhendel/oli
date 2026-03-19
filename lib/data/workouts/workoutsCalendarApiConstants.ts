/**
 * Page size for GET /users/me/raw-events when hydrating the workouts calendar.
 * Must be ≤ rawEventsListQuerySchema `limit` max (100) or the API returns 400 INVALID_QUERY.
 */
export const WORKOUTS_CALENDAR_RAW_EVENTS_PAGE_SIZE = 100 as const;
