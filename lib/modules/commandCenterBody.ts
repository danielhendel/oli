// lib/modules/commandCenterBody.ts
import type { DailyFactsDto } from "../contracts/dailyFacts";

export type ReadinessVocabularyState = "loading" | "empty" | "invalid" | "partial" | "ready";

export type BodySummaryUi = {
  weightKg?: number;
  bodyFatPercent?: number;
};

export type BodyCommandCenterModel = {
  state: ReadinessVocabularyState;
  title: string;
  description: string;
  summary: BodySummaryUi | null;
  showLogWeightCta: boolean;
  showFailuresCta: boolean;
};

const KG_TO_LB = 2.2046226218;

/**
 * US locales use lbs-first display; others use kg-first.
 * Heuristic: locale starts with "en-US" or equals "en-US" (match cardio approach).
 */
export function isLbsFirstLocale(locale: string): boolean {
  return locale === "en-US" || locale.toLowerCase().startsWith("en-us");
}

export function formatWeightDualDisplay(args: {
  weightKg: number;
  locale?: string;
}): { primary: string; secondary: string; combined: string } {
  const { weightKg, locale = "en-US" } = args;
  const lbs = weightKg * KG_TO_LB;
  const lbStr = lbs.toFixed(1);
  const kgStr = weightKg.toFixed(1);
  const lbsFirst = isLbsFirstLocale(locale);

  if (lbsFirst) {
    return {
      primary: `${lbStr} lb`,
      secondary: `${kgStr} kg`,
      combined: `${lbStr} lb (${kgStr} kg)`,
    };
  }
  return {
    primary: `${kgStr} kg`,
    secondary: `${lbStr} lb`,
    combined: `${kgStr} kg (${lbStr} lb)`,
  };
}

export function buildBodyCommandCenterModel(args: {
  dataReadinessState: ReadinessVocabularyState;
  factsDoc: DailyFactsDto | null;
  hasFailures: boolean;
  locale?: string;
}): BodyCommandCenterModel {
  const { dataReadinessState, factsDoc, hasFailures, locale = "en-US" } = args;

  if (dataReadinessState === "loading") {
    return {
      state: "loading",
      title: "Body",
      description: "Loading derived body summary…",
      summary: null,
      showLogWeightCta: false,
      showFailuresCta: false,
    };
  }

  if (dataReadinessState === "invalid") {
    return {
      state: "invalid",
      title: "Body",
      description:
        "Your derived truth is currently invalid (pipeline error). Fix upstream issues or review failures to understand why body data cannot be computed.",
      summary: null,
      showLogWeightCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "empty") {
    return {
      state: "empty",
      title: "Body",
      description: "No events yet today — log weight to generate today's body summary.",
      summary: null,
      showLogWeightCta: true,
      showFailuresCta: hasFailures,
    };
  }

  if (dataReadinessState === "partial") {
    return {
      state: "partial",
      title: "Body",
      description:
        "Your derived truth is still building (partial). Some derived data for today may be missing until the pipeline catches up.",
      summary: null,
      showLogWeightCta: true,
      showFailuresCta: hasFailures,
    };
  }

  // dataReadinessState === "ready"
  const body = factsDoc?.body;

  // Fail closed: readiness ready but body missing
  if (!body) {
    return {
      state: "partial",
      title: "Body",
      description:
        "Derived truth is ready, but today's body summary is missing from DailyFacts. This usually means no body events were processed or the mapping is incomplete.",
      summary: null,
      showLogWeightCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const hasWeightKg = typeof body.weightKg === "number";
  const hasBodyFatPercent = typeof body.bodyFatPercent === "number";

  const hasAnyMetric = hasWeightKg || hasBodyFatPercent;

  if (!hasAnyMetric) {
    return {
      state: "partial",
      title: "Body",
      description:
        "Body data exists but has no metrics (weight or body fat). Log weight or add DEXA data to build today's summary.",
      summary: null,
      showLogWeightCta: true,
      showFailuresCta: hasFailures,
    };
  }

  const summary: BodySummaryUi = {};
  const weightKgVal = body.weightKg;
  const bodyFatVal = body.bodyFatPercent;

  if (typeof weightKgVal === "number") summary.weightKg = weightKgVal;
  if (typeof bodyFatVal === "number") summary.bodyFatPercent = bodyFatVal;

  const parts: string[] = [];
  if (typeof weightKgVal === "number") {
    const { combined } = formatWeightDualDisplay({ weightKg: weightKgVal, locale });
    parts.push(`Weight ${combined}`);
  }
  if (typeof bodyFatVal === "number") {
    parts.push(`Body fat ${bodyFatVal.toFixed(1)}%`);
  }

  const description = parts.length ? `Today: ${parts.join(" • ")}` : "No body metrics yet.";

  return {
    state: "ready",
    title: "Body",
    description,
    summary,
    showLogWeightCta: false,
    showFailuresCta: hasFailures,
  };
}
