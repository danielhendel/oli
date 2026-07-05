import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { TodayProgressCardRow } from "@/lib/today/buildTodayProgressCardRows";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { ENERGY_BASELINE_FILL_COLOR } from "@/lib/ui/energy/EnergyBaselineProgressTrack";
import { UI_PROGRESS_TRACK_EMPTY, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

type Props = {
  row: TodayProgressCardRow;
};

/** Matches Weekly Fitness row bar geometry (height/radius) with blue fill. */
const BAR_HEIGHT = 8;
const BAR_RADIUS = 4;

export function TodayProgressCardRow({ row }: Props): React.ReactElement {
  const router = useRouter();
  const onPress = useCallback(() => {
    router.push(row.routeTarget as Href);
  }, [router, row.routeTarget]);

  const fillPercent = Math.round(Math.min(1, Math.max(0, row.progress)) * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityHint={`Opens ${row.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]}
      testID={`today-progress-row-${row.id}`}
    >
      <View style={styles.rowBlock}>
        <View style={styles.rowTop}>
          <Text style={[dashMetricRowLabelTextStyle, styles.label]} numberOfLines={1}>
            {row.label}
          </Text>
          <View style={styles.figureGroup}>
            <Text
              style={[dashMetricRowValueTextStyle, styles.figure]}
              numberOfLines={1}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {row.value}
            </Text>
            <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
              {"\u203A"}
            </Text>
          </View>
        </View>
        <View
          style={styles.barTrack}
          accessibilityElementsHidden
          importantForAccessibility="no"
          testID={`today-progress-bar-${row.id}`}
        >
          <View
            style={[
              styles.barFill,
              {
                width: `${fillPercent}%` as `${number}%`,
                backgroundColor: ENERGY_BASELINE_FILL_COLOR,
              },
            ]}
            testID={`today-progress-bar-fill-${row.id}`}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowPressable: {
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.88,
  },
  rowBlock: {
    gap: 5,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
  },
  figureGroup: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    maxWidth: "62%",
  },
  figure: {
    flexShrink: 1,
    textAlign: "right",
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
  },
  barTrack: {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    backgroundColor: UI_PROGRESS_TRACK_EMPTY,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: BAR_RADIUS,
  },
});
