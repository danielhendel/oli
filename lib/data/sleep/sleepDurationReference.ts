/**
 * Versioned Sleep Duration educational reference ranges (Phase 2D pilot).
 *
 * Pure domain model — no React, React Native, Firebase, network, or I/O.
 *
 * modelId: sleep-duration-reference
 * modelVersion: sleep-duration-reference-v1
 *
 * Evidence package (educational consumer guidance, not a diagnosis):
 * - NSF age-specific duration recommendations (2015), reaffirmed 2026
 * - AASM/SRS adult lower-bound consensus (2015; ≥7h for adults)
 *
 * Age bands (completed years):
 * - 18–64 inclusive → recommended 7–9h (420–540 minutes, inclusive)
 * - 65+ → recommended 7–8h (420–480 minutes, inclusive)
 * - Under 18 or unknown/invalid age → no personalized range (fail closed)
 *
 * Sex-specific duration boundaries are not used (NSF 2026: no sex-specific need).
 * “Above typical” is neutral — longer sleep is not automatically better or clinical.
 * One night does not define Sleep Health State.
 */

export const SLEEP_DURATION_REFERENCE_MODEL_ID = "sleep-duration-reference" as const;

export const SLEEP_DURATION_REFERENCE_MODEL_VERSION = "sleep-duration-reference-v1" as const;

export const SLEEP_DURATION_REFERENCE_EVIDENCE_IDS = [
  "nsf-sleep-duration-2015-2026",
  "aasm-srs-adult-duration-2015",
] as const;

export type SleepDurationReferenceEvidenceId =
  (typeof SLEEP_DURATION_REFERENCE_EVIDENCE_IDS)[number];

export type SleepDurationReferenceStatus =
  | "below_recommended"
  | "within_recommended"
  | "above_typical";

export type SleepDurationReferenceLabel =
  | "Below recommended"
  | "Recommended"
  | "Above typical";

export type SleepDurationReferenceResult = {
  status: SleepDurationReferenceStatus;
  label: SleepDurationReferenceLabel;
  lowerRecommendedMinutes: number;
  upperRecommendedMinutes: number;
  /** Absolute minutes from the crossed bound; null when within recommended. */
  deltaMinutes: number | null;
  modelVersion: typeof SLEEP_DURATION_REFERENCE_MODEL_VERSION;
  evidenceIds: readonly SleepDurationReferenceEvidenceId[];
};

export type SleepDurationReferenceAgeBand = "adult_18_64" | "older_adult_65_plus";

/** Visual domain for the horizontal reference bar (5h–11h). Classification is independent. */
export const SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MIN_MINUTES = 5 * 60;
export const SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MAX_MINUTES = 11 * 60;

const ADULT_LOWER = 7 * 60;
const ADULT_UPPER = 9 * 60;
const OLDER_LOWER = 7 * 60;
const OLDER_UPPER = 8 * 60;

function isValidDurationMinutes(minutes: number): boolean {
  return typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0;
}

/**
 * Map completed age years to a supported reference band.
 * Returns null for unknown age, under 18, or non-finite age.
 */
export function sleepDurationReferenceAgeBand(
  ageYears: number | null | undefined,
): SleepDurationReferenceAgeBand | null {
  if (ageYears == null || typeof ageYears !== "number" || !Number.isFinite(ageYears)) {
    return null;
  }
  const age = Math.trunc(ageYears);
  if (age < 18) return null;
  if (age >= 65) return "older_adult_65_plus";
  return "adult_18_64";
}

export function sleepDurationReferenceBoundsForAgeBand(
  band: SleepDurationReferenceAgeBand,
): { lowerRecommendedMinutes: number; upperRecommendedMinutes: number } {
  if (band === "older_adult_65_plus") {
    return { lowerRecommendedMinutes: OLDER_LOWER, upperRecommendedMinutes: OLDER_UPPER };
  }
  return { lowerRecommendedMinutes: ADULT_LOWER, upperRecommendedMinutes: ADULT_UPPER };
}

/**
 * Classify raw integer duration minutes against the age-applicable recommended range.
 * Does not round before classification. Returns null when age or duration is inapplicable.
 */
export function classifySleepDurationReference(input: {
  durationMinutes: number | null | undefined;
  ageYears: number | null | undefined;
}): SleepDurationReferenceResult | null {
  const { durationMinutes, ageYears } = input;
  if (!isValidDurationMinutes(durationMinutes as number)) return null;
  const band = sleepDurationReferenceAgeBand(ageYears);
  if (band == null) return null;

  const minutes = durationMinutes as number;
  const { lowerRecommendedMinutes, upperRecommendedMinutes } =
    sleepDurationReferenceBoundsForAgeBand(band);

  let status: SleepDurationReferenceStatus;
  let label: SleepDurationReferenceLabel;
  let deltaMinutes: number | null;

  if (minutes < lowerRecommendedMinutes) {
    status = "below_recommended";
    label = "Below recommended";
    deltaMinutes = lowerRecommendedMinutes - minutes;
  } else if (minutes > upperRecommendedMinutes) {
    status = "above_typical";
    label = "Above typical";
    deltaMinutes = minutes - upperRecommendedMinutes;
  } else {
    status = "within_recommended";
    label = "Recommended";
    deltaMinutes = null;
  }

  return {
    status,
    label,
    lowerRecommendedMinutes,
    upperRecommendedMinutes,
    deltaMinutes,
    modelVersion: SLEEP_DURATION_REFERENCE_MODEL_VERSION,
    evidenceIds: SLEEP_DURATION_REFERENCE_EVIDENCE_IDS,
  };
}

function formatDeltaPhrase(deltaMinutes: number): string {
  if (deltaMinutes < 60) return `${deltaMinutes} min`;
  const h = Math.floor(deltaMinutes / 60);
  const m = deltaMinutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Neutral consumer status sentence under the hero value.
 * Returns null when no personalized reference applies.
 */
export function formatSleepDurationReferenceStatusSentence(
  result: SleepDurationReferenceResult | null,
): string | null {
  if (result == null) return null;
  if (result.status === "within_recommended") {
    return "Within the recommended range.";
  }
  if (result.status === "below_recommended" && result.deltaMinutes != null) {
    return `${formatDeltaPhrase(result.deltaMinutes)} below the recommended range.`;
  }
  if (result.status === "above_typical") {
    if (result.deltaMinutes != null) {
      return `${formatDeltaPhrase(result.deltaMinutes)} above the typical recommended range.`;
    }
    return "Above the typical recommended range.";
  }
  return null;
}

/** Concise zone labels for the reference bar (written meaning; color is supplementary). */
export function sleepDurationReferenceZoneCopy(result: SleepDurationReferenceResult): {
  belowLabel: string;
  recommendedLabel: string;
  aboveLabel: string;
  belowRangeText: string;
  recommendedRangeText: string;
  aboveRangeText: string;
} {
  const lowerH = result.lowerRecommendedMinutes / 60;
  const upperH = result.upperRecommendedMinutes / 60;
  const lowerText = Number.isInteger(lowerH) ? `${lowerH}h` : `${lowerH}h`;
  const upperText = Number.isInteger(upperH) ? `${upperH}h` : `${upperH}h`;
  return {
    belowLabel: "Below recommended",
    recommendedLabel: "Recommended",
    aboveLabel: "Above typical",
    belowRangeText: `< ${lowerText}`,
    recommendedRangeText: `${lowerText}–${upperText}`,
    aboveRangeText: `> ${upperText}`,
  };
}

/**
 * Marker position 0–1 along the visual domain [5h, 11h], clamped.
 * Classification uses raw minutes independently of this mapping.
 */
export function sleepDurationReferenceMarkerPosition01(durationMinutes: number): number {
  const min = SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MIN_MINUTES;
  const max = SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MAX_MINUTES;
  if (!Number.isFinite(durationMinutes)) return 0;
  if (durationMinutes <= min) return 0;
  if (durationMinutes >= max) return 1;
  return (durationMinutes - min) / (max - min);
}

/** Zone width fractions within the visual domain for a classified result. */
export function sleepDurationReferenceZoneFractions(result: SleepDurationReferenceResult): {
  below: number;
  recommended: number;
  above: number;
} {
  const min = SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MIN_MINUTES;
  const max = SLEEP_DURATION_REFERENCE_VISUAL_DOMAIN_MAX_MINUTES;
  const span = max - min;
  const lower = Math.max(min, Math.min(max, result.lowerRecommendedMinutes));
  const upper = Math.max(min, Math.min(max, result.upperRecommendedMinutes));
  const below = Math.max(0, (lower - min) / span);
  const recommended = Math.max(0, (upper - lower) / span);
  const above = Math.max(0, 1 - below - recommended);
  return { below, recommended, above };
}

export function sleepDurationReferenceAccessibilitySummary(input: {
  formattedDuration: string;
  result: SleepDurationReferenceResult | null;
}): string {
  const { formattedDuration, result } = input;
  if (result == null) {
    return `Sleep Duration ${formattedDuration}. Personalized recommended range unavailable.`;
  }
  const lowerH = result.lowerRecommendedMinutes / 60;
  const upperH = result.upperRecommendedMinutes / 60;
  const rangePhrase = `${lowerH} to ${upperH} hours`;
  const status = formatSleepDurationReferenceStatusSentence(result);
  return `Sleep Duration ${formattedDuration}. The recommended range for your age is ${rangePhrase}. ${status ?? ""}`.trim();
}

/** Versioned consumer explainer copy (scientifically material; not sheet JSX). */
export const SLEEP_DURATION_DETAIL_EXPLAINER_COPY = {
  whatItMeasures: {
    heading: "What it measures",
    body: "Sleep Duration is the estimated time you were asleep in your main sleep session. It is not the same as time in bed.",
  },
  howToUnderstand: {
    heading: "How to understand it",
    body: "For adults in the supported age group, experts commonly recommend about 7–9 hours, or 7–8 hours at age 65 and older. One night is one data point; weekly and monthly patterns give better context. Duration is only one part of sleep.",
  },
  dataAccuracyBase: {
    heading: "Data & accuracy",
    body: "This estimate comes from your connected wearable sleep summary, not a clinical sleep study. Missing nights are omitted from averages. Results may change after late synchronization or completion updates.",
  },
  unknownAgeNote:
    "Personalized recommended ranges need a valid age from your profile. Averages still use your sleep history when available.",
  minorAgeNote:
    "Age-specific recommended ranges for people under 18 are not shown in this experience yet.",
} as const;
