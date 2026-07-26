/**
 * Domain-owned educational copy for Resting Heart Rate detail (Phase 2F-B).
 * Concise, non-diagnostic. Do not hardcode long paragraphs in JSX.
 */

export type RestingHeartRateExplainerCopy = {
  whatItMeasures: { heading: string; body: string };
  howToUnderstand: { heading: string; body: string };
  whatCanHelp: { heading: string; body: string };
  dataAccuracy: { heading: string; body: string };
};

export const RESTING_HEART_RATE_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body:
      "Resting heart rate here is the lowest heart rate your wearable recorded during your attributed overnight sleep period.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body:
      "Your overnight heart rate is most useful when compared with your own recent pattern. A result outside your usual range can happen for many reasons and does not by itself mean something is wrong.",
  },
  whatCanHelp: {
    heading: "What can help",
    body:
      "Consistent sleep, recovery, hydration, stress management, illness, alcohol, training load, and medication can all affect overnight heart rate. Look for repeated patterns rather than reacting to one night.",
  },
  dataAccuracy: {
    heading: "Data & accuracy",
    body:
      "This value comes from your wearable’s overnight heart-rate estimate. It may differ from a daytime resting-heart-rate measurement or a clinical reading and may change after synchronization.",
  },
} as const satisfies RestingHeartRateExplainerCopy;
