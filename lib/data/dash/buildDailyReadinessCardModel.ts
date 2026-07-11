import type { ReadinessViewDto } from "@oli/contracts";
import {
  buildDashReadinessMetricRows,
  type DashReadinessMetricRow,
} from "@/lib/data/dash/buildDashReadinessMetricRows";
import { normalizeOuraScore0to100, tryClassifyOuraScore } from "@/lib/format/ouraScore";

const EMPTY = "\u2014";

export type DailyReadinessCardModel = {
  day: string;
  headlineValueText: string | null;
  ratingLabel: string | null;
  summarySentence: string;
  sourceLabel: string | null;
  hasAnySignal: boolean;
  emptyStateTitle: string | null;
  emptyStateSubtitle: string | null;
  metricRows: DashReadinessMetricRow[];
};

function readinessSummary(score: number): string {
  if (score >= 80) return "Ready. Recovery signals are strong today.";
  if (score >= 65) return "Good overall recovery with some room to improve.";
  if (score >= 50) return "Take it easy. Recovery signals suggest a lighter day.";
  return "Recovery focus. Prioritize rest and easy movement today.";
}

export function buildDailyReadinessCardModel(args: {
  day: string;
  readinessView: ReadinessViewDto | null | undefined;
  ouraConnected: boolean | null;
  /**
   * Exact-day resting HR from the attributed SleepNight for the same calendar day.
   * Must not be supplied from a mismatched or fallback night.
   */
  exactDayRestingHeartRateBpm?: number | null;
}): DailyReadinessCardModel {
  const emptyRows: DashReadinessMetricRow[] = [];
  const sourceLabel = args.readinessView?.sourceId === "oura" ? "Oura" : null;
  /** Dash must not present 7-day / last-resort fallback readiness as current-day truth. */
  const isCurrentDayReadiness =
    args.readinessView != null &&
    args.readinessView.isFallback !== true &&
    args.readinessView.resolvedDay === args.day &&
    args.readinessView.requestedDay === args.day;

  if (args.ouraConnected === false) {
    return {
      day: args.day,
      headlineValueText: null,
      ratingLabel: null,
      summarySentence: "Connect Oura to see your readiness score.",
      sourceLabel: null,
      hasAnySignal: false,
      emptyStateTitle: "Oura not connected",
      emptyStateSubtitle: "Reconnect Oura to sync readiness.",
      metricRows: emptyRows,
    };
  }

  const score = normalizeOuraScore0to100(args.readinessView?.score);
  const hasScore = score != null;

  if (!hasScore || !isCurrentDayReadiness) {
    return {
      day: args.day,
      headlineValueText: null,
      ratingLabel: null,
      summarySentence: "No current-day readiness signal is available yet.",
      sourceLabel: null,
      hasAnySignal: false,
      emptyStateTitle: "No readiness for today",
      emptyStateSubtitle: "Today's plan is still available.",
      metricRows: emptyRows,
    };
  }

  const contributors =
    args.readinessView?.contributors && typeof args.readinessView.contributors === "object"
      ? (args.readinessView.contributors as Record<string, unknown>)
      : {};

  const metricRows = buildDashReadinessMetricRows({
    contributors,
    ...(args.exactDayRestingHeartRateBpm !== undefined
      ? { exactDayRestingHeartRateBpm: args.exactDayRestingHeartRateBpm }
      : {}),
  });

  const rating = tryClassifyOuraScore(score);

  return {
    day: args.day,
    headlineValueText: String(score),
    ratingLabel: rating,
    summarySentence: readinessSummary(score),
    sourceLabel,
    hasAnySignal: true,
    emptyStateTitle: null,
    emptyStateSubtitle: null,
    metricRows,
  };
}

export function dailyReadinessCardAccessibilityLabel(model: DailyReadinessCardModel): string {
  if (!model.hasAnySignal) {
    return `Oura Readiness. ${model.summarySentence}`;
  }
  const rowParts = model.metricRows
    .map((r) => `${r.label} ${r.accessibilityValue}`)
    .join(". ");
  return `Oura readiness. Score ${model.headlineValueText ?? EMPTY}. ${model.ratingLabel ?? ""}. ${model.summarySentence} ${rowParts}. Opens Readiness details.`;
}
