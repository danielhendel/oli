import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  StrengthThisWeekSessionRow,
  type StrengthThisWeekSessionRowProps,
} from "@/lib/ui/workouts/StrengthThisWeekSessionRow";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

export type StrengthThisWeekSessionRowModel = Omit<
  StrengthThisWeekSessionRowProps,
  "onPressRow" | "onPressMenu"
>;

type Props = {
  loading: boolean;
  emptyMessage: string;
  sessions: readonly StrengthThisWeekSessionRowModel[];
  onViewAll: () => void;
  onPressSession: (dayKey: string, sessionId: string) => void;
  onPressSessionMenu: (
    dayKey: string,
    sessionId: string,
    event: Parameters<StrengthThisWeekSessionRowProps["onPressMenu"]>[0],
  ) => void;
  testID?: string;
};

/**
 * Strength overview “This Week” — elevated card matching Weekly Working Volume rhythm.
 */
export function StrengthThisWeekCombinedCard({
  loading,
  emptyMessage,
  sessions,
  onViewAll,
  onPressSession,
  onPressSessionMenu,
  testID = "workouts-overview-this-week-combined-card",
}: Props): React.ReactElement {
  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel="This Week">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>This Week</Text>
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={onViewAll}
          accessibilityRole="button"
          accessibilityLabel="View all"
          hitSlop={8}
          style={({ pressed }) => [
            workoutOverviewInCardHeaderStyles.linkHit,
            styles.viewAllHit,
            pressed && workoutOverviewInCardHeaderStyles.linkPressed,
          ]}
          testID="strength-recent-week-combined-view-more"
        >
          <Text style={workoutOverviewInCardHeaderStyles.link}>View All →</Text>
        </Pressable>
      </View>

      {loading ? <LoadingState variant="inline" message="Loading workouts…" /> : null}

      {!loading && sessions.length === 0 ? (
        <Text style={styles.placeholder}>{emptyMessage}</Text>
      ) : null}

      {!loading && sessions.length > 0 ? (
        <View style={styles.sessionList} accessibilityRole="list">
          {sessions.map((session, index) => (
            <StrengthThisWeekSessionRow
              key={session.sessionId}
              {...session}
              isFirst={index === 0}
              onPressRow={() => onPressSession(session.dayKey, session.sessionId)}
              onPressMenu={(event) => onPressSessionMenu(session.dayKey, session.sessionId, event)}
            />
          ))}
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
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: strengthMetricCardTitleTextStyle,
  headerSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 8,
  },
  viewAllHit: {
    minHeight: 44,
    justifyContent: "center",
  },
  placeholder: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.1,
  },
  sessionList: {
    gap: 0,
    marginTop: 2,
  },
});
