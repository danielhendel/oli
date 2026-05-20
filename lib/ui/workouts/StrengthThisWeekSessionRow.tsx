import React from "react";
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatWeekdayUpperFromDayKey } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { strengthThisWeekRowTitle } from "@/lib/ui/workouts/strengthThisWeekRowTitle";
import { RECENT_WORKOUT_ROW_META_TEXT_STYLE } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import {
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type StrengthThisWeekSessionRowProps = {
  dayKey: string;
  sessionId: string;
  displayTitle: string;
  metadataLine: string;
  isFirst?: boolean;
  onPressRow: () => void;
  onPressMenu: (event: GestureResponderEvent) => void;
  rowAccessibilityLabel: string;
  menuAccessibilityLabel: string;
};

const MENU_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;

export function StrengthThisWeekSessionRow({
  dayKey,
  sessionId,
  displayTitle,
  metadataLine,
  isFirst = false,
  onPressRow,
  onPressMenu,
  rowAccessibilityLabel,
  menuAccessibilityLabel,
}: StrengthThisWeekSessionRowProps): React.ReactElement {
  const weekdayLabel = formatWeekdayUpperFromDayKey(dayKey);
  const title = strengthThisWeekRowTitle(displayTitle);
  const metaTrimmed = metadataLine.trim();
  const rowTestId = `workouts-overview-this-week-row-${sessionId}`;

  return (
    <Pressable
      testID={rowTestId}
      style={({ pressed }) => [styles.row, !isFirst && styles.rowDivider, pressed && styles.rowPressed]}
      onPress={onPressRow}
      accessibilityRole="button"
      accessibilityLabel={rowAccessibilityLabel}
    >
      {weekdayLabel.length > 0 ? (
        <Text style={styles.weekdayLabel} accessibilityElementsHidden importantForAccessibility="no">
          {weekdayLabel}
        </Text>
      ) : null}
      <View style={styles.titleMenuRow}>
        <Text style={styles.workoutTitle} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        <Pressable
          testID={`${rowTestId}-menu`}
          onPress={(e) => {
            e?.stopPropagation?.();
            onPressMenu(e);
          }}
          accessibilityRole="button"
          accessibilityLabel={menuAccessibilityLabel}
          hitSlop={MENU_HIT_SLOP}
          style={styles.menuBtn}
        >
          <Text style={styles.menuGlyph} accessibilityElementsHidden importantForAccessibility="no">
            •••
          </Text>
        </Pressable>
      </View>
      {metaTrimmed.length > 0 ? (
        <Text style={styles.metadataLine} numberOfLines={2}>
          {metaTrimmed}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingTop: 12,
    paddingBottom: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_PROGRESS_TRACK_EMPTY,
  },
  rowPressed: {
    opacity: 0.72,
  },
  weekdayLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: UI_TEXT_SECONDARY,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  titleMenuRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  workoutTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.24,
  },
  menuBtn: {
    minWidth: 44,
    minHeight: 44,
    marginTop: -10,
    marginRight: -8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuGlyph: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.2,
  },
  metadataLine: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 16,
    marginTop: -2,
  },
});
