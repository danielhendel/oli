import type { DailyFacts, YmdDateString } from '../types/health';
/**
 * Sprint 6 — Intelligence Context (Facts → Insights)
 *
 * Purpose:
 * - Provide a deterministic, pure, typed context object for the Insight rules engine.
 * - Centralize confidence gating, safe numeric helpers, and common derived comparisons.
 * - Strictly uses DailyFacts as input (no Firestore/Admin/I/O).
 *
 * Notes:
 * - DailyFacts enrichment (7d avgs, HRV baselines, domain confidence) is done upstream.
 * - This context is NOT a stored schema; it is an internal, deterministic construct.
 * - This file must remain recomputable and versionable.
 */
export declare const INTELLIGENCE_CONTEXT_VERSION: "intelligence-context-v1.0.0";
/**
 * Conservative gating threshold.
 * If a domain’s confidence is below this threshold, we avoid producing insights
 * that depend on that domain (prevents low-quality / low-coverage conclusions).
 */
export declare const DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD: 0.5;
export type DomainKey = keyof NonNullable<DailyFacts['confidence']>;
/**
 * Input for building the intelligence context.
 * - `today` is the target date’s facts (typically already enriched).
 * - `history` is recent prior days (recommended: up to 6 previous days).
 */
export interface BuildIntelligenceContextInput {
    today: DailyFacts;
    history: DailyFacts[];
    /**
     * Optional override for confidence gating.
     * If omitted, DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD is used.
     */
    domainConfidenceThreshold?: number;
}
/**
 * The canonical context object used by insight rules.
 */
export interface IntelligenceContext {
    /** Version for auditability and future migrations of logic */
    version: typeof INTELLIGENCE_CONTEXT_VERSION;
    userId: string;
    date: YmdDateString;
    /** The target day facts (source of truth for rule evaluation) */
    today: DailyFacts;
    /**
     * Prior daily facts used for “recent history” checks.
     * Caller may pass unsorted; we normalize deterministically.
     */
    history: readonly DailyFacts[];
    /**
     * A normalized window containing up to 7 days: history + today.
     * Deterministically sorted ascending by date.
     */
    window7d: readonly DailyFacts[];
    /** Confidence gating threshold in effect */
    domainConfidenceThreshold: number;
    /** Helpers */
    confidence: {
        get: (domain: DomainKey) => number | undefined;
        meetsThreshold: (domain: DomainKey) => boolean;
    };
    numbers: {
        isFiniteNumber: (value: unknown) => value is number;
        clamp01: (value: number) => number;
    };
    facts: {
        sleepTotalMinutes: () => number | undefined;
        steps: () => number | undefined;
        trainingLoad: () => number | undefined;
        stepsAvg7d: () => number | undefined;
        trainingLoadAvg7d: () => number | undefined;
        hrvRmssd: () => number | undefined;
        hrvRmssdBaseline: () => number | undefined;
        hrvRmssdDeviation: () => number | undefined;
        weightKg: () => number | undefined;
        bodyFatPercent: () => number | undefined;
    };
    comparisons: {
        delta: (current: number | undefined, reference: number | undefined) => number | undefined;
        ratio: (current: number | undefined, reference: number | undefined) => number | undefined;
    };
}
/**
 * Build the deterministic IntelligenceContext used by insight rules.
 */
export declare const buildIntelligenceContext: (input: BuildIntelligenceContextInput) => IntelligenceContext;
//# sourceMappingURL=intelligenceContext.d.ts.map