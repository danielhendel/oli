// services/functions/src/insights/rules.ts

import type {
    DailyFacts,
    Insight,
    InsightSeverity,
    IsoDateTimeString,
  } from '../types/health';
  
  const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
  
  export interface InsightRuleContext {
    userId: string;
    date: string; // YmdDateString but kept as string here to avoid circular import
    facts: DailyFacts;
    now: IsoDateTimeString;
  }
  
  /**
   * Minimum domain confidence required for an insight to fire.
   *
   * Option A (conservative): require at least 0.5 confidence so that
   * we only generate insights when we have reasonably dense data for
   * the relevant domain over the last 7 days.
   */
  const MIN_DOMAIN_CONFIDENCE = 0.5;
  
  type DomainKey = 'sleep' | 'activity' | 'recovery' | 'body';
  
  const getDomainConfidence = (facts: DailyFacts, domain: DomainKey): number | undefined =>
    facts.confidence?.[domain];
  
  const hasSufficientConfidence = (facts: DailyFacts, domain: DomainKey): boolean => {
    const value = getDomainConfidence(facts, domain);
    return typeof value === 'number' && value >= MIN_DOMAIN_CONFIDENCE;
  };
  
  /**
   * Deterministic ID for a given rule + day.
   * Ensures re-runs overwrite the same Insight document.
   */
  const buildInsightId = (date: string, kind: string): string => `${date}_${kind}`;
  
  const buildBaseInsight = (
    ctx: InsightRuleContext,
    kind: string,
    severity: InsightSeverity,
    title: string,
    message: string,
    tags: string[],
  ): Insight => {
    const id = buildInsightId(ctx.date, kind);
  
    return {
      id,
      userId: ctx.userId,
      date: ctx.date,
      kind,
      title,
      message,
      severity,
      evidence: [],
      tags,
      createdAt: ctx.now,
      updatedAt: ctx.now,
      ruleVersion: 'baseline-insights-v1.1.0',
      schemaVersion: 1,
    };
  };
  
  /**
   * Rule: low_sleep_duration
   * - Triggered when total sleep minutes < 7h (420 minutes).
   * - Requires sufficient sleep domain confidence.
   */
  const generateSleepInsights = (ctx: InsightRuleContext): Insight[] => {
    const { facts } = ctx;
    const sleepFacts = facts.sleep;
  
    if (!sleepFacts || !isNumber(sleepFacts.totalMinutes)) {
      return [];
    }
  
    if (!hasSufficientConfidence(facts, 'sleep')) {
      return [];
    }
  
    const totalMinutes = sleepFacts.totalMinutes;
    const thresholdMinutes = 420;
  
    if (totalMinutes >= thresholdMinutes) {
      return [];
    }
  
    const hours = totalMinutes / 60;
    const title = 'Low sleep duration';
    const message = `You slept about ${hours.toFixed(
      1,
    )} hours, which is below the recommended 7+ hours. Consider prioritizing an earlier bedtime or reducing pre-sleep screen time.`;
  
    const insight = buildBaseInsight(
      ctx,
      'low_sleep_duration',
      'warning',
      title,
      message,
      ['sleep', 'recovery'],
    );
  
    insight.evidence.push({
      factPath: 'sleep.totalMinutes',
      value: totalMinutes,
      threshold: thresholdMinutes,
      direction: 'below',
    });
  
    return [insight];
  };
  
  /**
   * Rule: low_steps
   * - Triggered when steps < 8,000 for the day.
   * - Requires sufficient activity domain confidence.
   */
  const generateStepsInsights = (ctx: InsightRuleContext): Insight[] => {
    const { facts } = ctx;
    const activity = facts.activity;
  
    if (!activity || !isNumber(activity.steps)) {
      return [];
    }
  
    if (!hasSufficientConfidence(facts, 'activity')) {
      return [];
    }
  
    const steps = activity.steps;
    const threshold = 8000;
  
    if (steps >= threshold) {
      return [];
    }
  
    const title = 'Low daily movement';
    const message = `You logged ${steps.toLocaleString()} steps, below the target of ${threshold.toLocaleString()}. Try adding a short walk or movement break tomorrow.`;
  
    const insight = buildBaseInsight(
      ctx,
      'low_steps',
      'info',
      title,
      message,
      ['activity', 'movement'],
    );
  
    insight.evidence.push({
      factPath: 'activity.steps',
      value: steps,
      threshold,
      direction: 'below',
    });
  
    return [insight];
  };
  
  /**
   * Rule: high_training_load
   * - Triggered when trainingLoad > 150 for the day.
   * - Requires sufficient activity domain confidence.
   */
  const generateTrainingLoadInsights = (ctx: InsightRuleContext): Insight[] => {
    const { facts } = ctx;
    const activity = facts.activity;
  
    if (!activity || !isNumber(activity.trainingLoad)) {
      return [];
    }
  
    if (!hasSufficientConfidence(facts, 'activity')) {
      return [];
    }
  
    const load = activity.trainingLoad;
    const threshold = 150;
  
    if (load <= threshold) {
      return [];
    }
  
    const title = 'High training load';
    const message = `Your training load (${load.toFixed(
      0,
    )}) was high today. Make sure you have enough recovery planned over the next 24–48 hours.`;
  
    const insight = buildBaseInsight(
      ctx,
      'high_training_load',
      'warning',
      title,
      message,
      ['training', 'recovery'],
    );
  
    insight.evidence.push({
      factPath: 'activity.trainingLoad',
      value: load,
      threshold,
      direction: 'above',
    });
  
    return [insight];
  };
  
  /**
   * Rule: low_hrv (simple same-day check)
   * - Triggered when hrvRmssd < 50 ms.
   * - Requires sufficient recovery domain confidence.
   *
   * Note: future versions can pivot entirely to deviation vs. baseline
   * (hrvRmssdDeviation), but v1.1 stays simple while still being
   * confidence-gated.
   */
  const generateHrvInsights = (ctx: InsightRuleContext): Insight[] => {
    const { facts } = ctx;
    const recovery = facts.recovery;
  
    if (!recovery || !isNumber(recovery.hrvRmssd)) {
      return [];
    }
  
    if (!hasSufficientConfidence(facts, 'recovery')) {
      return [];
    }
  
    const hrv = recovery.hrvRmssd;
    const threshold = 50;
  
    if (hrv >= threshold) {
      return [];
    }
  
    const title = 'Low HRV today';
    const message = `Your HRV (RMSSD) was ${hrv.toFixed(
      0,
    )} ms today, which may indicate higher stress or lower recovery. Consider prioritizing sleep, hydration, and light movement.`;
  
    const insight = buildBaseInsight(
      ctx,
      'low_hrv',
      'info',
      title,
      message,
      ['recovery', 'hrv'],
    );
  
    insight.evidence.push({
      factPath: 'recovery.hrvRmssd',
      value: hrv,
      threshold,
      direction: 'below',
    });
  
    return [insight];
  };
  
  /**
   * Generate all v1 baseline insights for a given DailyFacts document.
   *
   * - Pure and deterministic.
   * - Safe to call multiple times (IDs are deterministic per-day/per-rule).
   * - Now confidence-aware: rules will not fire if domain confidence is low.
   */
  export const generateInsightsForDailyFacts = (ctx: InsightRuleContext): Insight[] => {
    return [
      ...generateSleepInsights(ctx),
      ...generateStepsInsights(ctx),
      ...generateTrainingLoadInsights(ctx),
      ...generateHrvInsights(ctx),
    ];
  };
  