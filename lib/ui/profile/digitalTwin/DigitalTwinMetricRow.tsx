// lib/ui/profile/digitalTwin/DigitalTwinMetricRow.tsx
// Reusable tappable metric row matching Dash card rows (label · value · chevron, 44px tap target).
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";
import type { MetricRowVm } from "@/lib/features/profile/digitalTwin/types";

export type DigitalTwinMetricRowProps = {
  row: MetricRowVm;
  onPress: (href: string) => void;
  testID?: string;
};

export function DigitalTwinMetricRow({
  row,
  onPress,
  testID,
}: DigitalTwinMetricRowProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={() => onPress(row.href)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={testID ?? `dt-metric-row-${row.id}`}
    >
      <View style={styles.labelCol}>
        <Text style={[dashMetricRowLabelTextStyle, styles.label]} numberOfLines={1}>
          {row.label}
        </Text>
        {row.description != null ? (
          <Text style={styles.description} numberOfLines={1}>
            {row.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.rightCluster}>
        {row.value != null ? (
          <Text
            style={[dashMetricRowValueTextStyle, styles.value]}
            numberOfLines={1}
          >
            {row.value}
          </Text>
        ) : null}
        <Pressable
          testID={`dt-metric-row-chevron-${row.id}`}
          accessible={false}
          pointerEvents="none"
          style={styles.chevronPressable}
        >
          <Text style={styles.chevron} accessible={false}>
            {"\u203A"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.88,
  },
  labelCol: {
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: UI_TEXT_MUTED,
    letterSpacing: -0.04,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  value: {
    flexShrink: 1,
  },
  chevronPressable: {
    flexShrink: 0,
    justifyContent: "center",
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
  },
});
