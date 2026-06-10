// lib/ui/profile/digitalTwin/DigitalTwinSystemCard.tsx
// Collapsible Dash-style system card. Collapsed: title + subtitle + expand chevron.
// Expanded: all metric rows (each navigates to its metric detail page). Starts collapsed.
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { SystemVm } from "@/lib/features/profile/digitalTwin/types";
import { DigitalTwinMetricRow } from "@/lib/ui/profile/digitalTwin/DigitalTwinMetricRow";

export type DigitalTwinSystemCardProps = {
  system: SystemVm;
  onPressRow: (href: string) => void;
  /** Initial expanded state (defaults to collapsed). */
  defaultExpanded?: boolean;
};

export function DigitalTwinSystemCard({
  system,
  onPressRow,
  defaultExpanded = false,
}: DigitalTwinSystemCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const metricCount = system.rows.length;
  const headerA11y = `${system.title}. ${system.statusLabel}. ${
    expanded ? "Expanded" : "Collapsed"
  }. ${metricCount} metric${metricCount === 1 ? "" : "s"}. Double tap to ${
    expanded ? "collapse" : "expand"
  }`;

  return (
    <Pressable
      style={styles.card}
      testID={`dt-system-card-${system.id}`}
      accessible={false}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={headerA11y}
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        testID={`dt-system-header-${system.id}`}
      >
        <View style={styles.headerText}>
          <Text
            style={[strengthMetricCardTitleTextStyle, styles.title]}
            accessibilityRole="header"
          >
            {system.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {system.subtitle}
          </Text>
        </View>
        <Text style={[styles.expandIcon, expanded && styles.expandIconOpen]} accessible={false}>
          {"\u203A"}
        </Text>
      </Pressable>

      {expanded && system.rows.length > 0 ? (
        <Pressable
          style={styles.rowsWrap}
          testID={`dt-system-rows-${system.id}`}
          accessible={false}
          pointerEvents="box-none"
        >
          {system.rows.map((row) => (
            <DigitalTwinMetricRow key={row.id} row={row} onPress={onPressRow} />
          ))}
        </Pressable>
      ) : null}
    </Pressable>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
  },
  headerPressed: {
    opacity: 0.92,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
  },
  expandIcon: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
    transform: [{ rotate: "90deg" }],
  },
  expandIconOpen: {
    transform: [{ rotate: "-90deg" }],
    color: UI_TEXT_PRIMARY,
  },
  rowsWrap: {
    gap: 6,
    marginTop: 2,
  },
});
