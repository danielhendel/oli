/**
 * Shared Dash metric row: label, value, optional trailing chevron, full-row press.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

export type DashMetricRowProps = {
  label: string;
  displayValue: string;
  accessibilityValue: string;
  onPress?: () => void;
  accessibilityHint?: string;
  testID?: string;
};

export function DashMetricRow({
  label,
  displayValue,
  accessibilityValue,
  onPress,
  accessibilityHint,
  testID,
}: DashMetricRowProps): React.ReactElement {
  const actionable = typeof onPress === "function";
  const a11yLabel = `${label}. ${accessibilityValue}`;

  if (!actionable) {
    return (
      <View
        testID={testID}
        style={styles.row}
        accessible
        accessibilityLabel={a11yLabel}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{displayValue}</Text>
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={styles.rowInner}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.right}>
          <Text style={styles.value}>{displayValue}</Text>
          <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
            {"\u203A"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 7,
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 44,
    paddingVertical: 7,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
  label: dashMetricRowLabelTextStyle,
  value: {
    ...dashMetricRowValueTextStyle,
    fontVariant: ["tabular-nums"],
  },
});
