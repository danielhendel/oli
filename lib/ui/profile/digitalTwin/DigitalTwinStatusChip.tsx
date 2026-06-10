// lib/ui/profile/digitalTwin/DigitalTwinStatusChip.tsx
// Status chip shared by the system card and system page. Color reflects server-truth status only.
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { UI_GOAL_PILL_SURFACE, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";
import type { SystemStatus } from "@/lib/features/profile/digitalTwin/types";

const STATUS_COLOR: Record<SystemStatus, string> = {
  strong: "#30D158",
  good: "#0A84FF",
  watch: "#FFD60A",
  needsData: UI_TEXT_MUTED,
  unavailable: UI_TEXT_MUTED,
};

export type DigitalTwinStatusChipProps = {
  status: SystemStatus;
  label: string;
};

export function DigitalTwinStatusChip({
  status,
  label,
}: DigitalTwinStatusChipProps): React.ReactElement {
  return (
    <View style={styles.chip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.dot, { backgroundColor: STATUS_COLOR[status] }]} />
      <Text style={[styles.label, { color: STATUS_COLOR[status] }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: UI_GOAL_PILL_SURFACE,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: -0.04,
  },
});
