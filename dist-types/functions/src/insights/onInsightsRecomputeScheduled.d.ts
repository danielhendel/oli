/**
 * Scheduled job:
 *  - Runs daily (UTC)
 *  - Finds users who have DailyFacts for the target date (yesterday UTC)
 *  - Loads a 7-day DailyFacts window for each user (history + today)
 *  - Generates Insights using Sprint 6 IntelligenceContext-aware rules
 *  - Writes results under /users/{userId}/insights/{insightId}
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/dailyFacts/{yyyy-MM-dd}
 *  - Output: /users/{userId}/insights/{insightId}
 */
export declare const onInsightsRecomputeScheduled: import("firebase-functions/v2/scheduler").ScheduleFunction;
//# sourceMappingURL=onInsightsRecomputeScheduled.d.ts.map