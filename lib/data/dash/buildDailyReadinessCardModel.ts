import type { ReadinessViewDto } from "@oli/contracts";
import { scoreToRatingLabel } from "@/lib/format/ouraScore";

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
};

export function buildDailyReadinessCardModel(args: {
  day: string;
  readinessView: ReadinessViewDto | null | undefined;
  ouraConnected: boolean | null;
}): DailyReadinessCardModel {
  const score = args.readinessView?.score;
  const hasScore = typeof score === "number" && Number.isFinite(score);
  const sourceLabel = args.readinessView?.sourceId === "oura" ? "Oura" : null;

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
    };
  }

  if (!hasScore) {
    return {
      day: args.day,
      headlineValueText: null,
      ratingLabel: null,
      summarySentence: "Waiting for Oura readiness data.",
      sourceLabel: null,
      hasAnySignal: false,
      emptyStateTitle: "Readiness pending",
      emptyStateSubtitle: "Today's plan is still available.",
    };
  }

  const rating = scoreToRatingLabel(score);
  const statusWord =
    score >= 80 ? "Ready" : score >= 65 ? "Moderate" : score >= 50 ? "Take it easy" : "Recovery focus";

  return {
    day: args.day,
    headlineValueText: String(Math.round(score)),
    ratingLabel: rating,
    summarySentence: `${statusWord}. Oura readiness score for today.`,
    sourceLabel,
    hasAnySignal: true,
    emptyStateTitle: null,
    emptyStateSubtitle: null,
  };
}

export function dailyReadinessCardAccessibilityLabel(model: DailyReadinessCardModel): string {
  if (!model.hasAnySignal) {
    return `Oura Readiness. ${model.summarySentence}`;
  }
  return `Oura readiness. Score ${model.headlineValueText ?? EMPTY}. ${model.ratingLabel ?? ""}. Opens Readiness details.`;
}
