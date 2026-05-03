import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY } from "@/lib/ui/activity/activityUiTypography";
import { ActivityRatingPill } from "@/lib/ui/activity/ActivityRatingPill";
import {
  StrengthBaselineFrequencyTrack,
  strengthBaselineFrequencyTrackAccessibilityPercent,
} from "@/lib/ui/workouts/StrengthBaselineFrequencyTrack";
import { StrengthBaselineFrequencyMarkers } from "@/lib/ui/workouts/StrengthBaselineFrequencyMarkers";
import type { StrengthWeeklyFrequencyCardDisplayModel } from "@/lib/ui/workouts/strengthWeeklyFrequencyCardTypes";
import { moduleOverviewMetricLayoutStyles } from "@/lib/ui/overview/moduleOverviewMetricLayout";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";


type StrengthFrequencyMetricCardProps = {
  headingTitle: string;
  loading: boolean;
  model: StrengthWeeklyFrequencyCardDisplayModel | null;
  footerCaption: string;
  ratingPillTestID: string;
  frequencyBarTestID: string;
  instrumentClusterTestID: string;
  /** `embedded`: no outer card chrome — parent supplies the elevated surface (see combined Recent Workouts card). */
  variant?: "standalone" | "embedded";
  /** When false, hides the 0–7 marker row below the bar (Strength Baseline keeps default `true`). */
  showFrequencyMarkers?: boolean;
  /** When false, hides the footer support/definition line (Strength Baseline keeps default `true`). */
  showFooterCaption?: boolean;
  /** When false, hides the frequency track + markers cluster (This Week summary-only header). */
  showFrequencyTrack?: boolean;
  /** Replaces the large primary figure on the title row (e.g. inline View More link). */
  titleRowTrailing?: React.ReactNode;
  /** Optional muted subtitle below the title row (e.g. “N sessions this week”). */
  mutedMicroCaption?: string | null;
  /** Stronger secondary body text (Strength This Week summary line). */
  mutedCaptionEmphasis?: boolean;
  /** Tighter horizontal gap between heading and rating pill (embedded This Week). */
  compactTitlePillSpacing?: boolean;
};

function FrequencyTrackRow({
  testID,
  tierIndex,
  fillWidth01,
}: {
  testID: string;
  tierIndex: number;
  fillWidth01: number;
}) {
  const pct = strengthBaselineFrequencyTrackAccessibilityPercent(tierIndex, fillWidth01);
  return (
    <StrengthBaselineFrequencyTrack
      testID={testID}
      tierIndex={tierIndex}
      fillWidth01={fillWidth01}
      wrapperProps={{
        accessibilityRole: "progressbar",
        accessibilityValue: { now: pct, min: 0, max: 100 },
      }}
    />
  );
}

/**
 * Shared shell for Strength Baseline + This Week: activity-grade row, optional 0–7 frequency track,
 * optional markers/caption. This Week embed mode can omit the track and show summary + trailing link only.
 */
export function StrengthFrequencyMetricCard({
  headingTitle,
  loading,
  model,
  footerCaption,
  ratingPillTestID,
  frequencyBarTestID,
  instrumentClusterTestID,
  variant = "standalone",
  showFrequencyMarkers = true,
  showFooterCaption = true,
  showFrequencyTrack = true,
  titleRowTrailing,
  mutedMicroCaption = null,
  mutedCaptionEmphasis = false,
  compactTitlePillSpacing = false,
}: StrengthFrequencyMetricCardProps) {
  const primary = model?.compactValuePrimary ?? null;
  const tierIdx = model != null ? Math.min(model.activityTierIndexForBar, ACTIVITY_STEP_RATING_TIERS.length - 1) : 0;
  const tierPill = ACTIVITY_STEP_RATING_TIERS[tierIdx]!;
  const microTrimmed = mutedMicroCaption?.trim() ?? "";
  const showMutedMicro = microTrimmed.length > 0;
  const titleRowA11y =
    loading || model == null
      ? headingTitle
      : showMutedMicro
        ? `${headingTitle}. ${model.ratingLabel}. ${microTrimmed}. View all.`
        : `${model.ratingLabel}, ${primary ?? ""}`;
  const rootStyle: StyleProp<ViewStyle> =
    variant === "embedded"
      ? [styles.embeddedRoot, !showFrequencyTrack && styles.embeddedRootCompactHeaderOnly]
      : styles.card;
  const embeddedCompact =
    variant === "embedded" &&
    (!showFrequencyMarkers || !showFooterCaption || !showFrequencyTrack);
  const metricFooterGapStyle =
    showFrequencyMarkers && showFooterCaption
      ? styles.metricFooterStackBaselineWithMarkers
      : embeddedCompact
        ? styles.metricFooterStackEmbeddedCompact
        : styles.metricFooterStack;

  const titleRowEl = (
    <View
      style={[
        moduleOverviewMetricLayoutStyles.topRow,
        styles.activityRowTop,
        styles.titleNumberRow,
        embeddedCompact && styles.titleNumberRowEmbeddedCompact,
      ]}
      accessible={!showMutedMicro}
      accessibilityRole={showMutedMicro ? undefined : "header"}
      accessibilityLabel={showMutedMicro ? undefined : titleRowA11y}
    >
      <View style={[styles.titlePillLeftGroup, compactTitlePillSpacing && styles.titlePillLeftGroupTight]}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {headingTitle}
        </Text>
        {!loading && model != null ? (
          <ActivityRatingPill
            label={model.ratingLabel}
            color={tierPill.color}
            backgroundColor={tierPill.backgroundColor}
            emphasis="subtle"
            compactChrome
            labelTypography={ACTIVITY_DETAILS_SUBTLE_PILL_LABEL_TYPOGRAPHY}
            testID={ratingPillTestID}
          />
        ) : null}
      </View>
      {titleRowTrailing != null ? (
        titleRowTrailing
      ) : !loading && model != null && primary != null ? (
        <Text style={styles.primaryValueFigure} numberOfLines={1}>
          {primary}
        </Text>
      ) : null}
    </View>
  );

  const headingSection =
    showMutedMicro ? (
      <View style={styles.headingSummaryStack} accessible accessibilityRole="header" accessibilityLabel={titleRowA11y}>
        {titleRowEl}
        {!loading ? (
          <Text style={mutedCaptionEmphasis ? styles.emphasizedSecondaryCaption : styles.mutedMicroCaption}>
            {microTrimmed}
          </Text>
        ) : null}
      </View>
    ) : (
      titleRowEl
    );

  return (
    <View style={rootStyle}>
      {headingSection}

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && model != null && showFrequencyTrack ? (
        <View
          style={[
            moduleOverviewMetricLayoutStyles.metricBlock,
            styles.activityDetailsMetricBlock,
            styles.metricFooterStack,
            metricFooterGapStyle,
          ]}
        >
          <View style={styles.baselineInstrumentCluster} testID={instrumentClusterTestID}>
            <FrequencyTrackRow
              testID={frequencyBarTestID}
              tierIndex={model.activityTierIndexForBar}
              fillWidth01={model.fillWidth01Override}
            />
            {showFrequencyMarkers ? <StrengthBaselineFrequencyMarkers /> : null}
          </View>
          {showFooterCaption ? <Text style={styles.footerCaption}>{footerCaption}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 11,
    ...elevatedCardSurfaceStyle,
  },
  embeddedRoot: {
    gap: 10,
    width: "100%",
  },
  embeddedRootCompactHeaderOnly: {
    gap: 0,
  },
  headingSummaryStack: {
    width: "100%",
    gap: 5,
  },
  mutedMicroCaption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.06,
    alignSelf: "flex-start",
  },
  emphasizedSecondaryCaption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.15,
    alignSelf: "flex-start",
  },
  activityDetailsMetricBlock: {
    gap: 10,
  },
  metricFooterStack: {
    gap: 10,
  },
  metricFooterStackEmbeddedCompact: {
    gap: 8,
  },
  metricFooterStackBaselineWithMarkers: {
    gap: 12,
  },
  baselineInstrumentCluster: {
    gap: 3,
  },
  activityRowTop: {
    alignItems: "baseline",
  },
  titleNumberRow: {
    paddingBottom: 2,
  },
  /** Tighter title → bar rhythm when embedded This Week omits markers + footer line. */
  titleNumberRowEmbeddedCompact: {
    paddingBottom: 0,
  },
  titlePillLeftGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
  },
  titlePillLeftGroupTight: {
    gap: 5,
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  primaryValueFigure: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.26,
    flexShrink: 1,
    textAlign: "right",
  },
  footerCaption: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
});
