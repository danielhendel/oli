import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import type { TodayProgressCardRow } from "@/lib/today/buildTodayProgressCardRows";
import { todayProgressCardAccessibilityLabel } from "@/lib/today/todayProgressCardAccessibility";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { UI_BORDER_HAIRLINE, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

type Props = {
  row: TodayProgressCardRow;
  isLast?: boolean;
};

export function TodayProgressCardRow({ row, isLast }: Props): React.ReactElement {
  const router = useRouter();
  const onPress = useCallback(() => {
    router.push(row.routeTarget as Href);
  }, [router, row.routeTarget]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={todayProgressCardAccessibilityLabel(row)}
      accessibilityHint={`Opens ${row.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.rowPressable, pressed && styles.pressed]}
      testID={`today-progress-row-${row.id}`}
    >
      <View style={[styles.rowTop, !isLast && styles.rowTopBorder]}>
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
          <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
            {"\u203A"}
          </Text>
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
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  rowTopBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
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
});
