// services/functions/src/insights/rules.ts
import { buildIntelligenceContext } from './intelligenceContext';
const isV2Input = (input) => input.today !== undefined;
/**
 * Deterministic ID for a given rule + day.
 * Ensures re-runs overwrite the same Insight document.
 */
const buildInsightId = (date, kind) => `${date}_${kind}`;
const buildBaseInsight = (params) => {
    const { userId, date, now, kind, severity, title, message, tags } = params;
    const id = buildInsightId(date, kind);
    return {
        id,
        userId,
        date,
        kind,
        title,
        message,
        severity,
        evidence: [],
        tags,
        createdAt: now,
        updatedAt: now,
        // Bump because rules are evaluated through IntelligenceContext (Sprint 6)
        ruleVersion: 'baseline-insights-v1.2.0',
        schemaVersion: 1,
    };
};
// -----------------------------------------------------------------------------
// Rules (evaluated via IntelligenceContext)
// -----------------------------------------------------------------------------
const generateSleepInsights = (params) => {
    const { userId, date, now, ctx } = params;
    if (!ctx.confidence.meetsThreshold('sleep'))
        return [];
    const totalMinutes = ctx.facts.sleepTotalMinutes();
    if (totalMinutes === undefined)
        return [];
    const thresholdMinutes = 420;
    if (totalMinutes >= thresholdMinutes)
        return [];
    const hours = totalMinutes / 60;
    const title = 'Low sleep duration';
    const message = `You slept about ${hours.toFixed(1)} hours, which is below the recommended 7+ hours. Consider prioritizing an earlier bedtime or reducing pre-sleep screen time.`;
    const insight = buildBaseInsight({
        userId,
        date,
        now,
        kind: 'low_sleep_duration',
        severity: 'warning',
        title,
        message,
        tags: ['sleep', 'recovery'],
    });
    insight.evidence.push({
        factPath: 'sleep.totalMinutes',
        value: totalMinutes,
        threshold: thresholdMinutes,
        direction: 'below',
    });
    return [insight];
};
const generateStepsInsights = (params) => {
    const { userId, date, now, ctx } = params;
    if (!ctx.confidence.meetsThreshold('activity'))
        return [];
    const steps = ctx.facts.steps();
    if (steps === undefined)
        return [];
    const threshold = 8000;
    if (steps >= threshold)
        return [];
    const title = 'Low daily movement';
    const message = `You logged ${steps.toLocaleString()} steps, below the target of ${threshold.toLocaleString()}. Try adding a short walk or movement break tomorrow.`;
    const insight = buildBaseInsight({
        userId,
        date,
        now,
        kind: 'low_steps',
        severity: 'info',
        title,
        message,
        tags: ['activity', 'movement'],
    });
    insight.evidence.push({
        factPath: 'activity.steps',
        value: steps,
        threshold,
        direction: 'below',
    });
    return [insight];
};
const generateTrainingLoadInsights = (params) => {
    const { userId, date, now, ctx } = params;
    if (!ctx.confidence.meetsThreshold('activity'))
        return [];
    const load = ctx.facts.trainingLoad();
    if (load === undefined)
        return [];
    const threshold = 150;
    if (load <= threshold)
        return [];
    const title = 'High training load';
    const message = `Your training load (${load.toFixed(0)}) was high today. Make sure you have enough recovery planned over the next 24–48 hours.`;
    const insight = buildBaseInsight({
        userId,
        date,
        now,
        kind: 'high_training_load',
        severity: 'warning',
        title,
        message,
        tags: ['training', 'recovery'],
    });
    insight.evidence.push({
        factPath: 'activity.trainingLoad',
        value: load,
        threshold,
        direction: 'above',
    });
    return [insight];
};
const generateHrvInsights = (params) => {
    const { userId, date, now, ctx } = params;
    if (!ctx.confidence.meetsThreshold('recovery'))
        return [];
    const hrv = ctx.facts.hrvRmssd();
    if (hrv === undefined)
        return [];
    const threshold = 50;
    if (hrv >= threshold)
        return [];
    const title = 'Low HRV today';
    const message = `Your HRV (RMSSD) was ${hrv.toFixed(0)} ms today, which may indicate higher stress or lower recovery. Consider prioritizing sleep, hydration, and light movement.`;
    const insight = buildBaseInsight({
        userId,
        date,
        now,
        kind: 'low_hrv',
        severity: 'info',
        title,
        message,
        tags: ['recovery', 'hrv'],
    });
    insight.evidence.push({
        factPath: 'recovery.hrvRmssd',
        value: hrv,
        threshold,
        direction: 'below',
    });
    return [insight];
};
// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------
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
export const generateInsightsForDailyFacts = (input) => {
    const userId = input.userId;
    const date = input.date;
    const now = input.now;
    const today = isV2Input(input) ? input.today : input.facts;
    const history = isV2Input(input) ? input.history : [];
    const ctx = buildIntelligenceContext({ today, history });
    return [
        ...generateSleepInsights({ userId, date, now, ctx }),
        ...generateStepsInsights({ userId, date, now, ctx }),
        ...generateTrainingLoadInsights({ userId, date, now, ctx }),
        ...generateHrvInsights({ userId, date, now, ctx }),
    ];
};
