/**
 * Domain-owned educational copy for Sleep Efficiency detail.
 * Concise, non-diagnostic. Do not hardcode long paragraphs in JSX.
 *
 * Explains the concept of efficiency without implying Oli recomputed it from
 * time in bed (SleepNight does not currently expose that denominator).
 */

export type SleepEfficiencyExplainerCopy = {
  whatItMeasures: { heading: string; body: string };
  howToUnderstand: { heading: string; body: string };
  whatCanHelp: { heading: string; body: string };
  dataAccuracy: { heading: string; body: string };
};

export const SLEEP_EFFICIENCY_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body: "Sleep efficiency is the percentage of your time in bed that your wearable estimated you were asleep.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body: "An efficiency of about 85% or higher is commonly used as a general sleep-quality guideline. Compare one night with your recent pattern rather than judging the result alone. Duration still matters — high efficiency with too little total sleep is not automatically enough.",
  },
  whatCanHelp: {
    heading: "What can help",
    body: "Give yourself enough time to sleep, keep a consistent schedule, and create a wind-down routine. If you spend long periods awake in bed, look for patterns in sleep timing, stress, caffeine, alcohol, and nighttime interruptions.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body: "This is your wearable’s reported sleep-efficiency estimate. Wearable estimates may differ from a clinical sleep study and may change after synchronization.",
  },
} as const satisfies SleepEfficiencyExplainerCopy;
