import type { DailyFacts } from '../types/health';
export interface EnrichDailyFactsInput {
    /**
     * The DailyFacts object computed for the current target date.
     * This is the document we will enrich with baselines and rolling averages.
     */
    today: DailyFacts;
    /**
     * Previous DailyFacts documents for this user.
     * Caller should ensure these represent recent days (ideally up to the last 6 days).
     */
    history: DailyFacts[];
}
/**
 * Enrich a DailyFacts document with:
 * - 7-day rolling averages for steps and trainingLoad
 * - HRV baseline and relative deviation
 * - Domain-level confidence scores (0–1) based on 7-day coverage
 *
 * Pure + deterministic. Idempotent (overwrites derived fields).
 */
export declare const enrichDailyFactsWithBaselinesAndAverages: (input: EnrichDailyFactsInput) => DailyFacts;
//# sourceMappingURL=enrichDailyFacts.d.ts.map