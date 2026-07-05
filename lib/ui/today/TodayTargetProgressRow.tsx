import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { TodayTargetProgress } from "@/lib/today/types";
import { todayTargetAccessibilityLabel } from "@/lib/today/todayTargetAccessibility";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import {
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_MUTED,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  row: TodayTargetProgress;
};

function accessibilityLabelForRow(row: TodayTargetProgress): string {
  return todayTargetAccessibilityLabel(row);
}

export function TodayTargetProgressRow({ row }: Props): React.ReactElement {
  const router = useRouter();
  const onPress = useCallback(() => {
    if (row.routeTarget) router.push(row.routeTarget as Href);
  }, [router, row.routeTarget]);

  const barWidthPct = Math.round(Math.min(1, Math.max(0, row.progress)) * 100);
  const showBar = row.includeInCompletion && row.target != null && row.status !== "missing";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabelForRow(row)}
      accessibilityHint={row.routeTarget ? `Opens ${row.label}` : undefined}
      onPress={onPress}
      disabled={!row.routeTarget}
      style={({ pressed }) => [styles.rowPressable, pressed && row.routeTarget && styles.pressed]}
      testID={`today-target-row-${row.id}`}
    >
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
            {row.displayValue}
          </Text>
          {row.routeTarget ? (
            <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
              {"\u203A"}
            </Text>
          ) : null}
        </View>
      </View>
      {row.secondaryLine ? (
        <Text
          style={styles.secondaryLine}
          numberOfLines={2}
          maxFontSizeMultiplier={1.25}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {row.secondaryLine}
        </Text>
      ) : null}
      <View
        style={styles.barTrack}
        accessibilityRole="progressbar"
        accessibilityLabel={`${row.label} progress`}
        accessibilityValue={{
          now: Math.round(Math.min(1, Math.max(0, row.progress)) * 100),
          min: 0,
          max: 100,
        }}
      >
        <View
          style={[
            styles.barFill,
            {
              width: showBar ? (`${barWidthPct}%` as `${number}%`) : "0%",
              backgroundColor:
                row.status === "missing" ? UI_PROGRESS_TRACK_EMPTY : WEEKLY_FITNESS_BAR_FILL_COLOR,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowPressable: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 10,
    gap: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.88,
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
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: UI_PROGRESS_TRACK_EMPTY,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  secondaryLine: {
    fontSize: 11,
    lineHeight: 14,
    color: UI_TEXT_MUTED,
    paddingLeft: 2,
  },
});
