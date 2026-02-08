// lib/modules/commandCenterCardio.ts
import type { Readiness } from "../contracts/readiness";
import type { DailyFactsDto } from "../contracts/dailyFacts";

export type ReadinessVocabularyState = Readiness;

export type CardioSummaryUi = {
  steps?: number;
  moveMinutes?: number;
  distanceKm?: number;
  trainingLoad?: number;
};

export type CardioCommandCenterModel = {
  state: ReadinessVocabularyState;
  title: string;
  description: string;
  summary: CardioSummaryUi | null;
  showWorkoutsCta: boolean;
  showFailuresCta: boolean;
};

const KM_TO_MI = 0.621371;

/**
 * US locales use miles-first display; others use km-first.
 * Heuristic: locale starts with "en-US" or equals "en-US".
 */
export function isMilesFirstLocale(locale: string): boolean {
  return locale === "en-US" || locale.toLowerCase().startsWith("en-us");
}

export function formatDistanceDualDisplay(args: {
  distanceKm: number;
  locale?: string;
}): { primary: string; secondary: string; combined: string } {
  const { distanceKm, locale = "en-US" } = args;
  const miles = distanceKm * KM_TO_MI;
  const miStr = miles.toFixed(2);
  const kmStr = distanceKm.toFixed(2);
  const milesFirst = isMilesFirstLocale(locale);

  if (milesFirst) {
    return {
      primary: `${miStr} mi`,
      secondary: `${kmStr} km`,
      combined: `${miStr} mi (${kmStr} km)`,
    };
  }
  return {
    primary: `${kmStr} km`,
    secondary: `${miStr} mi`,
    combined: `${kmStr} km (${miStr} mi)`,
  };
}

export function buildCardioCommandCenterModel(args: {
  dataReadinessState: ReadinessVocabularyState;
  factsDoc: DailyFactsDto | null;
  hasFailures: boolean;
  locale?: string;
}): CardioCommandCenterModel {
  const { dataReadinessState, factsDoc, hasFailures, locale = "en-US" } = args;

  if (dataReadinessState === "error") {
    return {
      state: "error",
      title: "Cardio",
      description:
        "Your derived truth is currently invalid (pipeline error). Fix upstream issues or review failures to understand why cardio cannot be computed.",
      summary: null,
      showWorkoutsCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "missing") {
    return {
      state: "missing",
      title: "Cardio",
      description: "No events yet today — log activity (steps, workouts) to generate today's cardio summary.",
      summary: null,
      showWorkoutsCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "partial") {
    return {
      state: "partial",
      title: "Cardio",
      description:
        "Your derived truth is still building (partial). Some derived data for today may be missing until the pipeline catches up.",
      summary: null,
      showWorkoutsCta: true,
      showFailuresCta: hasFailures,
    };
  }

  // dataReadinessState === "ready"
  const activity = factsDoc?.activity;

  // Fail closed: readiness ready but activity missing
  if (!activity) {
    return {
      state: "partial",
      title: "Cardio",
      description:
        "Derived truth is ready, but today's cardio/activity summary is missing from DailyFacts. This usually means no activity events were processed or the mapping is incomplete.",
      summary: null,
      showWorkoutsCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const hasSteps = typeof activity.steps === "number";
  const hasMoveMinutes = typeof activity.moveMinutes === "number";
  const hasDistanceKm = typeof activity.distanceKm === "number";
  const hasTrainingLoad = typeof activity.trainingLoad === "number";

  const hasAnyMetric = hasSteps || hasMoveMinutes || hasDistanceKm || hasTrainingLoad;

  if (!hasAnyMetric) {
    return {
      state: "partial",
      title: "Cardio",
      description:
        "Activity data exists but has no cardio metrics (steps, move minutes, distance, or training load). Add activity inputs to build today's summary.",
      summary: null,
      showWorkoutsCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const summary: CardioSummaryUi = {};
  const stepsVal = activity.steps;
  const moveMinutesVal = activity.moveMinutes;
  const distanceKmVal = activity.distanceKm;
  const trainingLoadVal = activity.trainingLoad;

  if (typeof stepsVal === "number") summary.steps = stepsVal;
  if (typeof moveMinutesVal === "number") summary.moveMinutes = moveMinutesVal;
  if (typeof distanceKmVal === "number") summary.distanceKm = distanceKmVal;
  if (typeof trainingLoadVal === "number") summary.trainingLoad = trainingLoadVal;

  const parts: string[] = [];
  if (typeof stepsVal === "number") parts.push(`${stepsVal.toLocaleString()} steps`);
  if (typeof moveMinutesVal === "number") parts.push(`${moveMinutesVal.toLocaleString()} min move`);
  if (typeof distanceKmVal === "number") {
    const { combined } = formatDistanceDualDisplay({ distanceKm: distanceKmVal, locale });
    parts.push(combined);
  }
  if (typeof trainingLoadVal === "number") parts.push(`load ${trainingLoadVal.toFixed(1)}`);

  const description = parts.length ? `Today: ${parts.join(" • ")}` : "No cardio metrics yet.";

  return {
    state: "ready",
    title: "Cardio",
    description,
    summary,
    showWorkoutsCta: false,
    showFailuresCta: hasFailures,
  };
}
