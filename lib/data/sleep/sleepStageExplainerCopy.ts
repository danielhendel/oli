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

export const DEEP_SLEEP_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body: "Deep sleep is a stage of sleep associated with physical restoration and reduced responsiveness to the environment.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body: "Deep sleep naturally varies from night to night and often changes with age. Your personal pattern across several nights is more useful than judging one night by itself.",
  },
  whatCanHelp: {
    heading: "What can help",
    body: "A consistent sleep schedule, enough total sleep time, regular activity, and limiting late alcohol may support healthier sleep patterns.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body: "Your wearable estimates sleep stages from signals such as movement and heart rate. Stage estimates may differ from a clinical sleep study.",
  },
} as const satisfies SleepStageExplainerCopy;

export const REM_SLEEP_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body: "REM sleep is a stage linked with dreaming, memory processing, learning, and emotional regulation.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body: "REM sleep varies across nights and is influenced by total sleep time, sleep timing, age, and recent sleep loss. Look at your pattern rather than one result alone.",
  },
  whatCanHelp: {
    heading: "What can help",
    body: "Protect enough total sleep time and keep your sleep schedule consistent. Shortened nights often reduce later-night REM opportunity.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body: "Your wearable estimates sleep stages from signals such as movement and heart rate. Stage estimates may differ from a clinical sleep study.",
  },
} as const satisfies SleepStageExplainerCopy;

export function sleepStageExplainerCopyFor(
  metricId: SleepStageMetricId,
): SleepStageExplainerCopy {
  return metricId === "deep_sleep"
    ? DEEP_SLEEP_DETAIL_EXPLAINER_COPY
    : REM_SLEEP_DETAIL_EXPLAINER_COPY;
}
