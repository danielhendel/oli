import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import { OLI_TAB_ROUTES } from "@/lib/navigation/tabRoutes";
import { buildTodayProgressCardRows } from "@/lib/today/buildTodayProgressCardRows";
import type { TodayCommandModel } from "@/lib/today/types";
import { TodayProgressCardRow } from "@/lib/ui/today/TodayProgressCardRow";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_GOAL_PILL_SURFACE, UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  model: TodayCommandModel | null;
  loading?: boolean;
};

export function TodayProgressCard({ model, loading }: Props): React.ReactElement {
  const router = useRouter();
  const rows = useMemo(
    () => (model != null ? buildTodayProgressCardRows(model) : []),
    [model],
  );

  const onPressMyProgram = useCallback(() => {
    router.push(OLI_TAB_ROUTES.program as Href);
  }, [router]);

  return (
    <View style={styles.card} accessibilityLabel="Today's progress card" testID="today-progress-card">
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          Today&apos;s Progress
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open my program"
          accessibilityHint="Opens the Program page to review or adjust today's targets"
          onPress={onPressMyProgram}
          style={({ pressed }) => [styles.programButton, pressed && styles.programButtonPressed]}
          testID="today-progress-my-program"
          hitSlop={8}
        >
          <Text style={styles.programButtonText}>My Program</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.status} testID="today-progress-loading">
          Loading today&apos;s progress…
        </Text>
      ) : (
        <View style={styles.rowsWrap} testID="today-progress-rows">
          {rows.map((row, index) => (
            <TodayProgressCardRow key={row.id} row={row} isLast={index === rows.length - 1} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 4,
    marginTop: 8,
    backgroundColor: UI_CARD_SURFACE,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    ...strengthMetricCardTitleTextStyle,
    flexShrink: 1,
    minWidth: 0,
  },
  programButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: UI_GOAL_PILL_SURFACE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    minHeight: 44,
  },
  programButtonPressed: {
    opacity: 0.85,
  },
  programButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.08,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    paddingVertical: 8,
  },
  rowsWrap: {
    marginTop: 2,
  },
});
