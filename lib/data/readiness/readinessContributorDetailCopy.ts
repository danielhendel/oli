/**
 * Domain-owned educational copy for Phase 2F-C2 readiness contributor details.
 * Concise, non-diagnostic. Provider ownership preserved. No formula reconstruction.
 */

import type { ReadinessContributorDetailMetric } from "@/lib/data/readiness/readinessContributorDetailTypes";

export type ReadinessContributorExplainerCopy = {
  whatItMeasures: { heading: string; body: string };
  howToUnderstand: { heading: string; body: string };
  whatCanHelp: { heading: string; body: string };
  dataAccuracy: { heading: string; body: string };
};

export const HRV_BALANCE_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body:
      "HRV Balance is an Oura readiness contributor that reflects how your recent heart-rate variability pattern compares with your longer-term pattern.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body:
      "The score is individualized and should not be compared with another person’s raw HRV. Use it together with your recent pattern rather than treating one day as a diagnosis.",
  },
  whatCanHelp: {
    heading: "What can help",
    body:
      "Sleep consistency, recovery, stress, illness, alcohol, training load, and other factors can affect HRV patterns. Look for repeated changes rather than reacting to one score.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body:
      "This is an Oura-derived contributor score, not a raw HRV measurement in milliseconds. Oli displays the provider score and does not reproduce Oura’s calculation.",
  },
} as const satisfies ReadinessContributorExplainerCopy;

export const BODY_TEMPERATURE_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body:
      "Body Temperature is an Oura readiness contributor based on how your overnight temperature pattern compares with your established baseline.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body:
      "This score reflects the provider’s interpretation of your temperature pattern. It is not the same as an oral, ear, or clinical body-temperature reading.",
  },
  whatCanHelp: {
    heading: "What can help",
    body:
      "Illness, environment, alcohol, sleep disruption, menstrual-cycle changes, training stress, and recovery can influence overnight temperature patterns.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body:
      "This is an Oura-derived contributor score. Oli does not currently display or reconstruct an absolute temperature or temperature deviation in this detail.",
  },
} as const satisfies ReadinessContributorExplainerCopy;

export const RECOVERY_INDEX_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body:
      "Recovery Index is an Oura readiness contributor that reflects how efficiently your resting heart rate settles during your sleep period.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body:
      "The score is a provider-derived interpretation, not a direct clinical measurement. Use the current result together with your recent pattern.",
  },
  whatCanHelp: {
    heading: "What can help",
    body:
      "Sleep timing, late meals, alcohol, stress, illness, and late intense exercise can influence overnight recovery patterns.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body:
      "This is an Oura-derived contributor score. Oli displays the provider result and does not reproduce the proprietary calculation.",
  },
} as const satisfies ReadinessContributorExplainerCopy;

export const SLEEP_BALANCE_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body:
      "Sleep Balance is an Oura readiness contributor that reflects how your recent sleep amount compares with your longer-term sleep need and pattern.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body:
      "Sleep Balance reflects more than last night alone. It is distinct from the Sleep Duration metric, which shows how long you slept during one attributed sleep period.",
  },
  whatCanHelp: {
    heading: "What can help",
    body:
      "Consistent sleep opportunity and enough total sleep across multiple nights can support a stronger sleep pattern.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body:
      "This is an Oura-derived contributor score. Oli does not independently reproduce the provider’s sleep-need or sleep-balance calculation.",
  },
} as const satisfies ReadinessContributorExplainerCopy;

export const READINESS_CONTRIBUTOR_DETAIL_COPY: Record<
  ReadinessContributorDetailMetric,
  ReadinessContributorExplainerCopy
> = {
  hrv_balance: HRV_BALANCE_DETAIL_EXPLAINER_COPY,
  body_temperature: BODY_TEMPERATURE_DETAIL_EXPLAINER_COPY,
  recovery_index: RECOVERY_INDEX_DETAIL_EXPLAINER_COPY,
  sleep_balance: SLEEP_BALANCE_DETAIL_EXPLAINER_COPY,
};

export function readinessContributorDetailCopyFor(
  metric: ReadinessContributorDetailMetric,
): ReadinessContributorExplainerCopy {
  return READINESS_CONTRIBUTOR_DETAIL_COPY[metric];
}
