/**
 * Sleep headline score card — vendor snapshot score only (Phase 1: Oura vendor view).
 * Never uses DailyFacts oliSleepScore for the headline number.
 */

import { scoreToRatingLabel } from "@/lib/format/ouraScore";
import { SLEEP_HEADLINE_FOOTNOTE_VENDOR, SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE } from "@/lib/format/sleepDisplay";

export type SleepHeadlineScoreSource = "vendor" | "none";

export type SleepHeadlineScoreCardModel = {
  title: "Sleep Score";
  score: number | null;
  ratingLabel: string | null;
  scoreFootnote: string | null;
  scoreUnavailableSubtitle: string | null;
  source: SleepHeadlineScoreSource;
};

/**
 * Oli read-model branch: vendor parallel view only for the headline score.
 */
export function buildSleepHeadlineScoreCardModelForOliPath(vendorScore: number | null): SleepHeadlineScoreCardModel {
  const title = "Sleep Score" as const;

  if (vendorScore != null) {
    return {
      title,
      score: vendorScore,
      ratingLabel: scoreToRatingLabel(vendorScore),
      scoreFootnote: SLEEP_HEADLINE_FOOTNOTE_VENDOR,
      scoreUnavailableSubtitle: null,
      source: "vendor",
    };
  }

  return {
    title,
    score: null,
    ratingLabel: null,
    scoreFootnote: null,
    scoreUnavailableSubtitle: SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE,
    source: "none",
  };
}

/** Oura-fallback branch: primary read is vendor `SleepViewDto`. */
export function buildSleepHeadlineScoreCardModelForOuraFallbackPath(
  ouraScore: number | null,
): SleepHeadlineScoreCardModel {
  const title = "Sleep Score" as const;

  if (ouraScore != null) {
    return {
      title,
      score: ouraScore,
      ratingLabel: scoreToRatingLabel(ouraScore),
      scoreFootnote: SLEEP_HEADLINE_FOOTNOTE_VENDOR,
      scoreUnavailableSubtitle: null,
      source: "vendor",
    };
  }

  return {
    title,
    score: null,
    ratingLabel: null,
    scoreFootnote: null,
    scoreUnavailableSubtitle: SLEEP_HEADLINE_VENDOR_SCORE_UNAVAILABLE,
    source: "none",
  };
}
