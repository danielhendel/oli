import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  StrengthThisWeekSessionRow,
  type StrengthThisWeekSessionRowProps,
} from "@/lib/ui/workouts/StrengthThisWeekSessionRow";

export type StrengthThisWeekSessionRowModel = Omit<
  StrengthThisWeekSessionRowProps,
  "onPressRow" | "onPressMenu"
>;

type Props = {
  loading: boolean;
  emptyMessage: string;
  sessions: readonly StrengthThisWeekSessionRowModel[];
  onPressSession: (dayKey: string, sessionId: string) => void;
  onPressSessionMenu: (
    dayKey: string,
    sessionId: string,
    event: Parameters<StrengthThisWeekSessionRowProps["onPressMenu"]>[0],
  ) => void;
  /**
   * Optional Activity-style week-range label (e.g. `"May 24\u201330"`). When provided,
   * previous/next chevrons are rendered alongside it in the header — mirrors
   * {@link ActivityThisWeekCard} so the two screens share the same week-navigation UX
   * without coupling component types.
   */
  weekRangeLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onPressPrevious?: () => void;
  onPressNext?: () => void;
  testID?: string;
};

/**
 * Strength overview “This Week” — elevated card matching Weekly Working Volume rhythm.
 * Header carries an Activity-style week navigator when `weekRangeLabel` is provided.
 */
export function StrengthThisWeekCombinedCard({
  loading,
  emptyMessage,
  sessions,
  onPressSession,
  onPressSessionMenu,
  weekRangeLabel,
  canGoPrevious = true,
  canGoNext = false,
  onPressPrevious,
  onPressNext,
  testID = "workouts-overview-this-week-combined-card",
}: Props): React.ReactElement {
  const previousDisabled = !canGoPrevious || onPressPrevious == null;
  const nextDisabled = !canGoNext || onPressNext == null;

  const navCluster =
    weekRangeLabel != null ? (
      <View style={styles.weekNavRow} testID="workouts-this-week-nav">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          accessibilityState={{ disabled: previousDisabled }}
          disabled={previousDisabled}
          onPress={onPressPrevious}
          hitSlop={10}
          testID="workouts-this-week-nav-previous"
          style={({ pressed }) => [
            styles.weekNavButton,
            previousDisabled && styles.weekNavButtonDisabled,
            pressed && !previousDisabled && styles.weekNavButtonPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={UI_TEXT_PRIMARY} />
        </Pressable>
        <Text
          style={styles.weekRangeLabel}
          numberOfLines={1}
          accessibilityLabel={`Week of ${weekRangeLabel}`}
          testID="workouts-this-week-range-label"
        >
          {weekRangeLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
          onPress={onPressNext}
          hitSlop={10}
          testID="workouts-this-week-nav-next"
          style={({ pressed }) => [
            styles.weekNavButton,
            nextDisabled && styles.weekNavButtonDisabled,
            pressed && !nextDisabled && styles.weekNavButtonPressed,
          ]}
        >
          <Ionicons name="chevron-forward" size={16} color={UI_TEXT_PRIMARY} />
        </Pressable>
      </View>
    ) : null;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel="This Week">
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>This Week</Text>
        <View style={styles.headerSpacer} />
        {navCluster}
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
  /** Mirrors {@link ActivityThisWeekCard} nav cluster — same visuals, no shared type coupling. */
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  weekNavButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  weekNavButtonDisabled: {
    opacity: 0.35,
  },
  weekNavButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  weekRangeLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    minWidth: 88,
    textAlign: "center",
  },
});
