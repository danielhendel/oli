/**
 * Scheduled job:
 *  - Runs daily (UTC), after Insights recompute
 *  - For each user with DailyFacts on targetDate:
 *      - Load Insights for that day
 *      - Build DailyIntelligenceContext doc
 *      - Write to /users/{userId}/intelligenceContext/{YYYY-MM-DD}
 *
 * Firestore paths:
 *  - Input:  /users/{userId}/dailyFacts/{yyyy-MM-dd}
 *  - Input:  /users/{userId}/insights/{yyyy-MM-dd}_{kind}
 *  - Output: /users/{userId}/intelligenceContext/{yyyy-MM-dd}
 */
export declare const onDailyIntelligenceContextRecomputeScheduled: import("firebase-functions/v2/scheduler").ScheduleFunction;
//# sourceMappingURL=onDailyIntelligenceContextRecomputeScheduled.d.ts.map