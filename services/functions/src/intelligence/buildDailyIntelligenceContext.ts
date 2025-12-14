// services/functions/src/intelligence/buildDailyIntelligenceContext.ts

import type {
    DailyFacts,
    DailyDomainConfidence,
    Insight,
    InsightSeverity,
    IsoDateTimeString,
    YmdDateString,
  } from '../types/health';
  
  export const DAILY_INTELLIGENCE_CONTEXT_VERSION = 'daily-intelligence-context-v1.0.0' as const;
  
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
  
  const DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD = 0.5 as const;
  
  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
  
  const clamp01 = (value: number): number => {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  };
  
  const getDomainConfidence = (
    confidence: DailyDomainConfidence | undefined,
    domain: DomainKey,
  ): number | undefined => {
    const v = confidence?.[domain];
    return isFiniteNumber(v) ? clamp01(v) : undefined;
  };
  
  const uniqueSorted = (values: string[]): string[] => {
    const set = new Set<string>();
    for (const v of values) {
      const trimmed = v.trim();
      if (trimmed.length > 0) set.add(trimmed);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };
  
  const emptySeverityCounts = (): Record<InsightSeverity, number> => ({
    info: 0,
    warning: 0,
    critical: 0,
  });
  
  const countBySeverity = (insights: Insight[]): Record<InsightSeverity, number> => {
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
  export const buildDailyIntelligenceContextDoc = (
    input: BuildDailyIntelligenceContextInput,
  ): DailyIntelligenceContextDoc => {
    // Keep the variable even if not used yet (Sprint 7 evolution).
    // Important: default for strict TS callers.
    const history: DailyFacts[] = input.history ?? [];
    void history;
  
    const thresholdRaw =
      typeof input.domainConfidenceThreshold === 'number'
        ? input.domainConfidenceThreshold
        : DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD;
  
    const domainConfidenceThreshold = Number.isFinite(thresholdRaw)
      ? thresholdRaw
      : DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD;
  
    const domainMeetsConfidence: Partial<Record<DomainKey, boolean>> = {};
    const conf = input.today.confidence;
  
    if (conf) {
      (Object.keys(conf) as DomainKey[]).forEach((domain) => {
        const score = getDomainConfidence(conf, domain);
        domainMeetsConfidence[domain] = score === undefined ? true : score >= domainConfidenceThreshold;
      });
    }
  
    // IMPORTANT for exactOptionalPropertyTypes:
    // - Do NOT set keys to undefined
    // - Only add keys when values are finite numbers
    const facts: DailyIntelligenceContextDoc['facts'] = {};
  
    const sleepTotalMinutes = input.today.sleep?.totalMinutes;
    if (isFiniteNumber(sleepTotalMinutes)) facts.sleepTotalMinutes = sleepTotalMinutes;
  
    const steps = input.today.activity?.steps;
    if (isFiniteNumber(steps)) facts.steps = steps;
  
    const trainingLoad = input.today.activity?.trainingLoad;
    if (isFiniteNumber(trainingLoad)) facts.trainingLoad = trainingLoad;
  
    const hrvRmssd = input.today.recovery?.hrvRmssd;
    if (isFiniteNumber(hrvRmssd)) facts.hrvRmssd = hrvRmssd;
  
    const hrvRmssdBaseline = input.today.recovery?.hrvRmssdBaseline;
    if (isFiniteNumber(hrvRmssdBaseline)) facts.hrvRmssdBaseline = hrvRmssdBaseline;
  
    const hrvRmssdDeviation = input.today.recovery?.hrvRmssdDeviation;
    if (isFiniteNumber(hrvRmssdDeviation)) facts.hrvRmssdDeviation = hrvRmssdDeviation;
  
    const weightKg = input.today.body?.weightKg;
    if (isFiniteNumber(weightKg)) facts.weightKg = weightKg;
  
    const bodyFatPercent = input.today.body?.bodyFatPercent;
    if (isFiniteNumber(bodyFatPercent)) facts.bodyFatPercent = bodyFatPercent;
  
    const tags: string[] = [];
    const kinds: string[] = [];
    const ids: string[] = [];
  
    for (const ins of input.insightsForDay) {
      ids.push(ins.id);
      kinds.push(ins.kind);
  
      // tags may be optional under exactOptionalPropertyTypes
      const insTags = ins.tags ?? [];
      for (const t of insTags) tags.push(t);
    }
  
    // Build WITHOUT confidence first (so we never set confidence: undefined)
    const doc: DailyIntelligenceContextDoc = {
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
  