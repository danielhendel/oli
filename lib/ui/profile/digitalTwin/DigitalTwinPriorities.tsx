// lib/ui/profile/digitalTwin/DigitalTwinPriorities.tsx
// Priorities section: grouped Attention / Opportunities / Missing Data rows, or a clean empty state.
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { PrioritiesVm } from "@/lib/features/profile/digitalTwin/types";

export type DigitalTwinPrioritiesProps = {
  priorities: PrioritiesVm;
  onPressRow: (href: string) => void;
};

export function DigitalTwinPriorities({
  priorities,
  onPressRow,
}: DigitalTwinPrioritiesProps): React.ReactElement {
  if (priorities.isEmpty) {
    return (
      <View style={styles.card} testID="dt-priorities-empty">
        <Text style={[strengthMetricCardTitleTextStyle, styles.title]} accessibilityRole="header">
          Priorities
        </Text>
        <Text style={styles.emptyCopy} accessibilityLabel={priorities.emptyCopy}>
          {priorities.emptyCopy}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="dt-priorities">
      <Text style={[strengthMetricCardTitleTextStyle, styles.title]} accessibilityRole="header">
        Priorities
      </Text>
      {priorities.groups.map((group) => (
        <View key={group.key} style={styles.group} testID={`dt-priority-group-${group.key}`}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            {group.title}
          </Text>
          {group.rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={row.accessibilityLabel}
              onPress={() => onPressRow(row.href)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              testID={`dt-priority-row-${row.id}`}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel} numberOfLines={2}>
                  {row.label}
                </Text>
                {row.detail ? (
                  <Text style={styles.rowDetail} numberOfLines={2}>
                    {row.detail}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>{"\u203A"}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    marginTop: 12,
    backgroundColor: UI_CARD_SURFACE,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  group: {
    gap: 4,
    marginTop: 4,
  },
  groupTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_PRIMARY,
  },
  rowDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
