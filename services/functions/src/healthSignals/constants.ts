// services/functions/src/healthSignals/constants.ts
// Phase 1.5 Sprint 4 — single source of truth for signal thresholds

export const HEALTH_SIGNALS_SCHEMA_VERSION = 1 as const;
export const HEALTH_SIGNALS_MODEL_VERSION = "1.0" as const;
export const BASELINE_WINDOW_DAYS = 14;
export const COMPOSITE_ATTENTION_LT = 65;
export const DOMAIN_ATTENTION_LT = 60;
export const DEVIATION_ATTENTION_PCT_LT = -0.15;
export const REQUIRED_DOMAINS = ["recovery", "training", "nutrition", "body"] as const;

export type RequiredDomain = (typeof REQUIRED_DOMAINS)[number];

export const SIGNAL_THRESHOLDS = {
  compositeAttentionLt: COMPOSITE_ATTENTION_LT,
  domainAttentionLt: DOMAIN_ATTENTION_LT,
  deviationAttentionPctLt: DEVIATION_ATTENTION_PCT_LT,
} as const;
