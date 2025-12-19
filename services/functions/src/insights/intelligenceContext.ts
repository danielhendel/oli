// services/functions/src/insights/intelligenceContext.ts

import type { DailyFacts, DailyDomainConfidence, YmdDateString } from '../types/health';

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

export const INTELLIGENCE_CONTEXT_VERSION = 'intelligence-context-v1.0.0' as const;

/**
 * Conservative gating threshold.
 * If a domain’s confidence is below this threshold, we avoid producing insights
 * that depend on that domain (prevents low-quality / low-coverage conclusions).
 */
export const DEFAULT_DOMAIN_CONFIDENCE_THRESHOLD = 0.5 as const;

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

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clamp01 = (value: number): number => {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const sortByDateAsc = (facts: DailyFacts[]): DailyFacts[] =>
  [...facts].sort((a, b) => {
    // YYYY-MM-DD string compare is safe lexicographically
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return 0;
  });

const getDomainConfidence = (
  confidence: DailyDomainConfidence | undefined,
  domain: DomainKey,
): number | undefined => {
  const value = confidence?.[domain];
  return isFiniteNumber(value) ? clamp01(value) : undefined;
};

const safeNumber = (value: unknown): number | undefined => (isFiniteNumber(value) ? value : undefined);

const buildWindow7d = (history: DailyFacts[], today: DailyFacts): DailyFacts[] => {
  // Deterministically dedupe by date keeping the last occurrence per date,
  // then ensure today is included.
  const map = new Map<YmdDateString, DailyFacts>();
  for (const item of history) {
    map.set(item.date, item);
  }
  map.set(today.date, today);

  const deduped = Array.from(map.values());
  const sorted = sortByDateAsc(deduped);

  // Keep only the most recent 7 days ending at today (if present).
  if (sorted.length <= 7) return sorted;
  return sorted.slice(sorted.length - 7);
};

/**
 * Build the deterministic IntelligenceContext used by insight rules.
 */
export const buildIntelligenceContext = (input: BuildIntelligenceContextInput): IntelligenceContext => {
  const raw =
    typeof input.domainConfidenceThreshold === 'number'
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
      get: (domain: DomainKey) => getDomainConfidence(input.today.confidence, domain),
      meetsThreshold: (domain: DomainKey) => {
        const score = getDomainConfidence(input.today.confidence, domain);
        // Conservative + consistent with rules.ts:
        // If confidence is missing, do NOT generate domain-dependent insights.
        if (score === undefined) return false;
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
        if (!isFiniteNumber(current) || !isFiniteNumber(reference)) return undefined;
        return current - reference;
      },
      ratio: (current, reference) => {
        if (!isFiniteNumber(current) || !isFiniteNumber(reference)) return undefined;
        if (reference === 0) return undefined;
        return current / reference;
      },
    },
  };
};
