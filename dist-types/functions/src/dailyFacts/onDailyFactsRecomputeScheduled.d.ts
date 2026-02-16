/**
 * Scheduled job:
 *  - Runs daily (UTC)
 *  - Recomputes DailyFacts for the previous UTC day across all users
 *  - Enriches DailyFacts with 7-day rolling averages and HRV baselines
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/events/{eventId}
 *  - Output: /users/{userId}/dailyFacts/{yyyy-MM-dd}
 */
export declare const onDailyFactsRecomputeScheduled: import("firebase-functions/v2/scheduler").ScheduleFunction;
//# sourceMappingURL=onDailyFactsRecomputeScheduled.d.ts.map