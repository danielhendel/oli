/**
 * Presentation-only compact Daily Monitor / Dash card header.
 * Title left; optional rating (+ source) right. No classification logic.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

export type DashCompactCardRating = {
  /** Visible primary rating label (e.g. Optimal, Moderate). */
  label: string;
  /** Optional small source under the rating (e.g. Oura). */
  sourceLabel?: string | null;
  /** Combined announcement for the rating cluster (includes purpose + source). */
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

  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {showRating ? (
        <View
          style={styles.badge}
          // Parent card Pressable owns spoken order; keep label for tests / tooling.
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          accessibilityLabel={rating.accessibilityLabel}
          accessibilityRole="text"
        >
          <Text style={styles.ratingLabel} numberOfLines={2}>
            {rating.label}
          </Text>
          {rating.sourceLabel != null && rating.sourceLabel.trim().length > 0 ? (
            <Text style={styles.sourceLabel} numberOfLines={1}>
              {rating.sourceLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
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
  sourceLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    textAlign: "right",
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
