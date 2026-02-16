import type { DailyFacts, DailyDomainConfidence, Insight, InsightSeverity, IsoDateTimeString, YmdDateString } from '../types/health';
export declare const DAILY_INTELLIGENCE_CONTEXT_VERSION: "daily-intelligence-context-v1.0.0";
export type DomainKey = keyof NonNullable<DailyFacts['confidence']>;
export interface BuildDailyIntelligenceContextInput {
    userId: string;
    date: YmdDateString;
    computedAt: IsoDateTimeString;
    today: DailyFacts;
    /**
     * Optional for strict TS ergonomics.
     * Callers that don't have a history window available can omit it.
     * When omitted, it is treated as an empty window.
     */
    history?: DailyFacts[];
    insightsForDay: Insight[];
    /**
     * Confidence gating threshold used for readiness flags.
     * If omitted, we treat missing confidence as "unknown" and do not block readiness.
     */
    domainConfidenceThreshold?: number;
}
export interface DailyIntelligenceContextDoc {
    schemaVersion: 1;
    version: typeof DAILY_INTELLIGENCE_CONTEXT_VERSION;
    id: YmdDateString;
    userId: string;
    date: YmdDateString;
    computedAt: IsoDateTimeString;
    facts: {
        sleepTotalMinutes?: number;
        steps?: number;
        trainingLoad?: number;
        hrvRmssd?: number;
        hrvRmssdBaseline?: number;
        hrvRmssdDeviation?: number;
        weightKg?: number;
        bodyFatPercent?: number;
    };
    /**
     * Optional due to exactOptionalPropertyTypes:
     * Only include when confidence exists (do NOT set to undefined).
     */
    confidence?: DailyDomainConfidence;
    insights: {
        count: number;
        bySeverity: Record<InsightSeverity, number>;
        tags: string[];
        kinds: string[];
        ids: string[];
    };
    readiness: {
        hasDailyFacts: boolean;
        hasInsights: boolean;
        domainMeetsConfidence: Partial<Record<DomainKey, boolean>>;
    };
}
/**
 * Build a deterministic DailyIntelligenceContext document for a given user+day.
 * - Pure function (no Firestore/admin I/O)
 * - Safe under exactOptionalPropertyTypes by OMITTING absent optional fields.
 */
export declare const buildDailyIntelligenceContextDoc: (input: BuildDailyIntelligenceContextInput) => DailyIntelligenceContextDoc;
/**
 * Backward-compatible export so other Sprint 7 files can keep importing:
 *   import { buildDailyIntelligenceContext } from './buildDailyIntelligenceContext';
 */
export declare const buildDailyIntelligenceContext: (input: BuildDailyIntelligenceContextInput) => DailyIntelligenceContextDoc;
//# sourceMappingURL=buildDailyIntelligenceContext.d.ts.map