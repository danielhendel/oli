import type { DailyFacts, Insight, IsoDateTimeString } from '../types/health';
/**
 * v2 input (Sprint 6): context-aware, supports historical window.
 */
export interface InsightRuleInputV2 {
    userId: string;
    date: string;
    today: DailyFacts;
    history: DailyFacts[];
    now: IsoDateTimeString;
}
/**
 * v1 input (legacy): single-day facts only.
 * We still support this so older callers don't break.
 */
export interface InsightRuleInputV1 {
    userId: string;
    date: string;
    facts: DailyFacts;
    now: IsoDateTimeString;
}
export type InsightRuleInput = InsightRuleInputV2 | InsightRuleInputV1;
/**
 * Generate all baseline insights for a given day.
 *
 * Sprint 6:
 * - Builds an IntelligenceContext from (today, history)
 * - Runs rules against the context (safe getters + centralized confidence gating)
 *
 * Deterministic:
 * - Insight IDs are date+kind
 * - Re-runs overwrite same documents
 */
export declare const generateInsightsForDailyFacts: (input: InsightRuleInput) => Insight[];
//# sourceMappingURL=rules.d.ts.map