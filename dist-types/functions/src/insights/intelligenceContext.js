// services/functions/src/insights/intelligenceContext.ts
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
export const INTELLIGENCE_CONTEXT_VERSION = 'intelligence-context-v1.0.0';
/**
 * Conservative gating threshold.
 * If a domain’s confidence is below this threshold, we avoid producing insights
 * that depend on that domain (prevents low-quality / low-coverage conclusions).
 */
export const DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD = 0.5;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clamp01 = (value) => {
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return value;
};
const sortByDateAsc = (facts) => [...facts].sort((a, b) => {
    // YYYY-MM-DD string compare is safe lexicographically
    if (a.date < b.date)
        return -1;
    if (a.date > b.date)
        return 1;
    return 0;
});
const getDomainConfidence = (confidence, domain) => {
    const value = confidence?.[domain];
    return isFiniteNumber(value) ? clamp01(value) : undefined;
};
const safeNumber = (value) => (isFiniteNumber(value) ? value : undefined);
const buildWindow7d = (history, today) => {
    // Deterministically dedupe by date keeping the last occurrence per date,
    // then ensure today is included.
    const map = new Map();
    for (const item of history) {
        map.set(item.date, item);
    }
    map.set(today.date, today);
    const deduped = Array.from(map.values());
    const sorted = sortByDateAsc(deduped);
    // Keep only the most recent 7 days ending at today (if present).
    if (sorted.length <= 7)
        return sorted;
    return sorted.slice(sorted.length - 7);
};
/**
 * Build the deterministic IntelligenceContext used by insight rules.
 */
export const buildIntelligenceContext = (input) => {
    const raw = typeof input.domainConfidenceThreshold === 'number'
        ? input.domainConfidenceThreshold
        : DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD;
    const domainConfidenceThreshold = clamp01(Number.isFinite(raw) ? raw : DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD);
    const historySorted = sortByDateAsc(input.history);
    const window7d = buildWindow7d(historySorted, input.today);
    return {
        version: INTELLIGENCE_CONTEXT_VERSION,
        userId: input.today.userId,
        date: input.today.date,
        today: input.today,
        history: historySorted,
        window7d,
        domainConfidenceThreshold,
        confidence: {
            get: (domain) => getDomainConfidence(input.today.confidence, domain),
            meetsThreshold: (domain) => {
                const score = getDomainConfidence(input.today.confidence, domain);
                // Conservative + consistent with rules.ts:
                // If confidence is missing, do NOT generate domain-dependent insights.
                if (score === undefined)
                    return false;
                return score >= domainConfidenceThreshold;
            },
        },
        numbers: {
            isFiniteNumber,
            clamp01,
        },
        facts: {
            sleepTotalMinutes: () => safeNumber(input.today.sleep?.totalMinutes),
            steps: () => safeNumber(input.today.activity?.steps),
            trainingLoad: () => safeNumber(input.today.activity?.trainingLoad),
            stepsAvg7d: () => safeNumber(input.today.activity?.stepsAvg7d),
            trainingLoadAvg7d: () => safeNumber(input.today.activity?.trainingLoadAvg7d),
            hrvRmssd: () => safeNumber(input.today.recovery?.hrvRmssd),
            hrvRmssdBaseline: () => safeNumber(input.today.recovery?.hrvRmssdBaseline),
            hrvRmssdDeviation: () => safeNumber(input.today.recovery?.hrvRmssdDeviation),
            weightKg: () => safeNumber(input.today.body?.weightKg),
            bodyFatPercent: () => safeNumber(input.today.body?.bodyFatPercent),
        },
        comparisons: {
            delta: (current, reference) => {
                if (!isFiniteNumber(current) || !isFiniteNumber(reference))
                    return undefined;
                return current - reference;
            },
            ratio: (current, reference) => {
                if (!isFiniteNumber(current) || !isFiniteNumber(reference))
                    return undefined;
                if (reference === 0)
                    return undefined;
                return current / reference;
            },
        },
    };
};
