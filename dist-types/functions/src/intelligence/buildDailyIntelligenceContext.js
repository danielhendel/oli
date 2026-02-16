// services/functions/src/intelligence/buildDailyIntelligenceContext.ts
export const DAILY_INTELLIGENCE_CONTEXT_VERSION = 'daily-intelligence-context-v1.0.0';
const DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD = 0.5;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const clamp01 = (value) => {
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return value;
};
const getDomainConfidence = (confidence, domain) => {
    const v = confidence?.[domain];
    return isFiniteNumber(v) ? clamp01(v) : undefined;
};
const uniqueSorted = (values) => {
    const set = new Set();
    for (const v of values) {
        const trimmed = v.trim();
        if (trimmed.length > 0)
            set.add(trimmed);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
};
const emptySeverityCounts = () => ({
    info: 0,
    warning: 0,
    critical: 0,
});
const countBySeverity = (insights) => {
    const out = emptySeverityCounts();
    for (const i of insights) {
        if (i.severity === 'info' || i.severity === 'warning' || i.severity === 'critical') {
            out[i.severity] += 1;
        }
    }
    return out;
};
/**
 * Build a deterministic DailyIntelligenceContext document for a given user+day.
 * - Pure function (no Firestore/admin I/O)
 * - Safe under exactOptionalPropertyTypes by OMITTING absent optional fields.
 */
export const buildDailyIntelligenceContextDoc = (input) => {
    // Keep the variable even if not used yet (Sprint 7 evolution).
    // Important: default for strict TS callers.
    const history = input.history ?? [];
    void history;
    const thresholdRaw = typeof input.domainConfidenceThreshold === 'number'
        ? input.domainConfidenceThreshold
        : DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD;
    const domainConfidenceThreshold = Number.isFinite(thresholdRaw)
        ? thresholdRaw
        : DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD;
    const domainMeetsConfidence = {};
    const conf = input.today.confidence;
    if (conf) {
        Object.keys(conf).forEach((domain) => {
            const score = getDomainConfidence(conf, domain);
            domainMeetsConfidence[domain] = score === undefined ? true : score >= domainConfidenceThreshold;
        });
    }
    // IMPORTANT for exactOptionalPropertyTypes:
    // - Do NOT set keys to undefined
    // - Only add keys when values are finite numbers
    const facts = {};
    const sleepTotalMinutes = input.today.sleep?.totalMinutes;
    if (isFiniteNumber(sleepTotalMinutes))
        facts.sleepTotalMinutes = sleepTotalMinutes;
    const steps = input.today.activity?.steps;
    if (isFiniteNumber(steps))
        facts.steps = steps;
    const trainingLoad = input.today.activity?.trainingLoad;
    if (isFiniteNumber(trainingLoad))
        facts.trainingLoad = trainingLoad;
    const hrvRmssd = input.today.recovery?.hrvRmssd;
    if (isFiniteNumber(hrvRmssd))
        facts.hrvRmssd = hrvRmssd;
    const hrvRmssdBaseline = input.today.recovery?.hrvRmssdBaseline;
    if (isFiniteNumber(hrvRmssdBaseline))
        facts.hrvRmssdBaseline = hrvRmssdBaseline;
    const hrvRmssdDeviation = input.today.recovery?.hrvRmssdDeviation;
    if (isFiniteNumber(hrvRmssdDeviation))
        facts.hrvRmssdDeviation = hrvRmssdDeviation;
    const weightKg = input.today.body?.weightKg;
    if (isFiniteNumber(weightKg))
        facts.weightKg = weightKg;
    const bodyFatPercent = input.today.body?.bodyFatPercent;
    if (isFiniteNumber(bodyFatPercent))
        facts.bodyFatPercent = bodyFatPercent;
    const tags = [];
    const kinds = [];
    const ids = [];
    for (const ins of input.insightsForDay) {
        ids.push(ins.id);
        kinds.push(ins.kind);
        // tags may be optional under exactOptionalPropertyTypes
        const insTags = ins.tags ?? [];
        for (const t of insTags)
            tags.push(t);
    }
    // Build WITHOUT confidence first (so we never set confidence: undefined)
    const doc = {
        schemaVersion: 1,
        version: DAILY_INTELLIGENCE_CONTEXT_VERSION,
        id: input.date,
        userId: input.userId,
        date: input.date,
        computedAt: input.computedAt,
        facts,
        insights: {
            count: input.insightsForDay.length,
            bySeverity: countBySeverity(input.insightsForDay),
            tags: uniqueSorted(tags),
            kinds: uniqueSorted(kinds),
            ids: uniqueSorted(ids),
        },
        readiness: {
            hasDailyFacts: true,
            hasInsights: input.insightsForDay.length > 0,
            domainMeetsConfidence,
        },
    };
    // Only include confidence if it exists
    if (input.today.confidence) {
        doc.confidence = input.today.confidence;
    }
    return doc;
};
/**
 * Backward-compatible export so other Sprint 7 files can keep importing:
 *   import { buildDailyIntelligenceContext } from './buildDailyIntelligenceContext';
 */
export const buildDailyIntelligenceContext = buildDailyIntelligenceContextDoc;
