/**
 * Admin-only HTTP endpoint
 * Recomputes DailyFacts for a specific user + date.
 *
 * Input:
 *  { "userId": "...", "date": "YYYY-MM-DD" }
 *
 * Output:
 *  { ok: true, written: true, path: "...", date: "...", userId: "..." }
 */
export declare const recomputeDailyFactsAdminHttp: import("firebase-functions/v2/https").HttpsFunction;
//# sourceMappingURL=recomputeDailyFactsAdminHttp.d.ts.map