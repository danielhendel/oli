// lib/ui/labs/LabMetricRow.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { UI_TEXT_MUTED, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { LabMetricFlag } from "@/lib/contracts";

export type LabMetricRowVm = {
  metricKey: string;
  label: string;
  valueText: string;
  flag?: LabMetricFlag | null;
};

export type LabMetricRowProps = {
  row: LabMetricRowVm;
  onPress: (metricKey: string) => void;
  testID?: string;
};

function flagColor(flag: LabMetricFlag | null | undefined): string | undefined {
  if (flag === "low") return "#5AC8FA";
  if (flag === "high" || flag === "critical") return "#FF9F0A";
  if (flag === "normal") return UI_TEXT_SECONDARY;
  return undefined;
}

export function LabMetricRow({ row, onPress, testID }: LabMetricRowProps) {
  const statusColor = flagColor(row.flag);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.label}, ${row.valueText}`}
      onPress={() => onPress(row.metricKey)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={testID ?? `lab-metric-row-${row.metricKey}`}
    >
      <Text style={[dashMetricRowLabelTextStyle, styles.label]} numberOfLines={1}>
        {row.label}
      </Text>
      <View style={styles.rightCluster}>
        {statusColor ? <View style={[styles.flagDot, { backgroundColor: statusColor }]} /> : null}
        <Text style={[dashMetricRowValueTextStyle, styles.value]} numberOfLines={1}>
          {row.valueText}
        </Text>
        <Text style={styles.chevron} accessible={false}>
          {"\u203A"}
        </Text>
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
  rowPressed: { opacity: 0.88 },
  label: { flex: 1, flexShrink: 1, minWidth: 0 },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  flagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  value: { flexShrink: 1 },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
  },
});
