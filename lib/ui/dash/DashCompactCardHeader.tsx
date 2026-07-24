/**
 * Presentation-only compact Daily Monitor / Dash card header.
 * Title left; optional rating badge right. Provider source is a separate chip.
 * No classification / threshold logic.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import type { DailyMonitorRatingTone } from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { resolveDashMonitorRatingToneChrome } from "@/lib/ui/theme/dashMonitorRatingToneChrome";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_PROVIDER_SOURCE_CHIP_BG,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

export type DashCompactCardRating = {
  /** Visible primary rating label (e.g. Optimal). Source must not be nested here. */
  label: string;
  /** Optional semantic tone for Sleep/Readiness Oura badges. Omit for neutral badges. */
  tone?: DailyMonitorRatingTone | null;
  /** Combined announcement for the rating (rating only — no color names). */
  accessibilityLabel: string;
};

export type DashCompactCardHeaderProps = {
  title: string;
  rating?: DashCompactCardRating | null;
};

/**
 * Compact card header: title on the left, optional rating badge on the right.
 * Rating is omitted when null/undefined. Not a button by itself.
 */
export function DashCompactCardHeader({
  title,
  rating = null,
}: DashCompactCardHeaderProps): React.ReactElement {
  const showRating = rating != null && rating.label.trim().length > 0;
  const toneChrome = useMemo(() => {
    if (!showRating || rating?.tone == null) return null;
    return resolveDashMonitorRatingToneChrome(rating.tone);
  }, [showRating, rating?.tone]);

  const badgeStyle: StyleProp<ViewStyle> = toneChrome
    ? [
        styles.badge,
        {
          backgroundColor: toneChrome.background,
          borderColor: toneChrome.border,
        },
      ]
    : styles.badge;

  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {showRating && rating != null ? (
        <View
          style={badgeStyle}
          // Parent card Pressable owns spoken order; keep label for tests / tooling.
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          accessibilityLabel={rating.accessibilityLabel}
          accessibilityRole="text"
          testID="dash-compact-rating-badge"
        >
          <Text
            style={[styles.ratingLabel, toneChrome != null ? { color: toneChrome.foreground } : null]}
            numberOfLines={2}
          >
            {rating.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type DashCompactProviderSourceChipProps = {
  /** Visible provider name (e.g. Oura). */
  label?: string;
};

/**
 * Neutral provider provenance chip — visually separate from the semantic rating badge.
 * Non-interactive; parent card Pressable owns the spoken summary.
 */
export function DashCompactProviderSourceChip({
  label = "Oura",
}: DashCompactProviderSourceChipProps): React.ReactElement {
  const trimmed = label.trim().length > 0 ? label.trim() : "Oura";
  return (
    <View
      style={styles.sourceChip}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      accessibilityLabel={`Source: ${trimmed}`}
      accessibilityRole="text"
      testID="dash-compact-provider-source"
    >
      <Text style={styles.sourceChipText} numberOfLines={1}>
        {trimmed}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 28,
  },
  title: {
    ...strengthMetricCardTitleTextStyle,
    flexShrink: 1,
    flexGrow: 1,
    color: UI_TEXT_PRIMARY,
  },
  badge: {
    flexShrink: 0,
    maxWidth: "46%",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: UI_CARD_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    minHeight: 28,
  },
  ratingLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "right",
  },
  sourceChip: {
    flexShrink: 0,
    alignSelf: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: UI_PROVIDER_SOURCE_CHIP_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    minHeight: 28,
    justifyContent: "center",
  },
  sourceChipText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
});

/** Shared subtle metric divider used under the primary area. */
export const dashCompactCardDividerStyle = {
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: UI_BORDER_HAIRLINE,
  paddingTop: 6,
  gap: 2,
  marginTop: 4,
} as const;

export const dashCompactPrimaryValueTextStyle = {
  marginTop: 8,
  fontSize: 28,
  lineHeight: 34,
  fontWeight: "700" as const,
  letterSpacing: -0.2,
  color: UI_TEXT_PRIMARY,
  fontVariant: ["tabular-nums" as const],
};

export const dashCompactDescriptorTextStyle = {
  marginTop: 4,
  fontSize: 14,
  lineHeight: 20,
  fontWeight: "500" as const,
  color: UI_TEXT_SECONDARY,
};

export const dashCompactMutedTextStyle = {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 18,
  color: UI_TEXT_MUTED,
};

/** Primary metric row: large value + optional neutral provider chip. */
export const dashCompactPrimaryRowStyle = {
  marginTop: 8,
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  alignItems: "center" as const,
  gap: 8,
};

export const dashCompactPrimaryValueInRowTextStyle = {
  fontSize: 28,
  lineHeight: 34,
  fontWeight: "700" as const,
  letterSpacing: -0.2,
  color: UI_TEXT_PRIMARY,
  fontVariant: ["tabular-nums" as const],
  flexShrink: 1,
};
