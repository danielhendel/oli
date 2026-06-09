// lib/ui/program/ProgramSectionCard.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type ProgramSectionCardProps = {
  title: string;
  subtitle?: string;
  /** Optional right-aligned pill, e.g. "Coming soon". */
  rightPill?: string;
  children?: React.ReactNode;
  testID?: string;
};

/** Shared elevated card shell for Program builder sections (dark, Apple-style). */
export function ProgramSectionCard({
  title,
  subtitle,
  rightPill,
  children,
  testID,
}: ProgramSectionCardProps): React.ReactElement {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {rightPill ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{rightPill}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginTop: -2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: UI_SURFACE_PRESSED,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
  },
  body: {
    marginTop: 2,
  },
});
