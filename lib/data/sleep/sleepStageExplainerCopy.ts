/**
 * Domain-owned educational copy for Deep / REM detail sheets.
 * Concise, non-diagnostic. Do not hardcode long paragraphs in JSX.
 */

import type { SleepStageMetricId } from "@/lib/data/sleep/sleepStageMetric";

export type SleepStageExplainerCopy = {
  whatItMeasures: { heading: string; body: string };
  howToUnderstand: { heading: string; body: string };
  whatCanHelp: { heading: string; body: string };
  dataAccuracy: { heading: string; body: string };
};

export const SLEEP_STAGE_UNSUPPORTED_AGE_HOW_TO_UNDERSTAND =
  "Sleep-stage patterns change with age. Your current result and recent personal pattern are shown without a general adult-context classification." as const;

export const DEEP_SLEEP_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body: "Deep sleep is a stage of sleep associated with physical restoration and reduced responsiveness to the environment.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body: "Adults often spend roughly 16–20% of total sleep in deep sleep, but deep sleep changes with age and varies from night to night. Use the adult context together with your own recent pattern rather than judging one night alone.",
  },
  whatCanHelp: {
    heading: "What can help",
    body: "Focus first on enough total sleep and a consistent sleep schedule. Late alcohol, illness, stress, and unusually hard training can also affect your sleep pattern.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body: "Your wearable estimates sleep stages using signals such as movement and heart rate. Stage estimates may differ from a clinical sleep study.",
  },
} as const satisfies SleepStageExplainerCopy;

export const REM_SLEEP_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body: "REM sleep is a stage linked with dreaming, memory processing, learning, and emotional regulation.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body: "Adults often spend roughly 21–30% of total sleep in REM sleep. REM is concentrated later in the sleep period, so shortened nights may reduce REM opportunity. Compare the adult context with your own recent pattern.",
  },
  whatCanHelp: {
    heading: "What can help",
    body: "Protect enough total sleep and keep your bedtime and wake time consistent. Avoid repeatedly shortening the end of the night.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body: "Your wearable estimates sleep stages using signals such as movement and heart rate. Stage estimates may differ from a clinical sleep study.",
  },
} as const satisfies SleepStageExplainerCopy;

export function sleepStageExplainerCopyFor(
  metricId: SleepStageMetricId,
): SleepStageExplainerCopy {
  return metricId === "deep_sleep"
    ? DEEP_SLEEP_DETAIL_EXPLAINER_COPY
    : REM_SLEEP_DETAIL_EXPLAINER_COPY;
}

/**
 * How-to-understand body with age-aware withholding for unsupported population context.
 */
export function sleepStageHowToUnderstandBody(input: {
  metricId: SleepStageMetricId;
  adultContextAvailable: boolean;
}): string {
  if (!input.adultContextAvailable) {
    return SLEEP_STAGE_UNSUPPORTED_AGE_HOW_TO_UNDERSTAND;
  }
  return sleepStageExplainerCopyFor(input.metricId).howToUnderstand.body;
}
