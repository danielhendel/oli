// lib/ui/program/CollapsibleCard.tsx
// Dark elevated card with a collapsible body (Apple Health–style). Header shows title + optional
// summary line and an expand/collapse chevron with accessible state. Expansion state is local.
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type CollapsibleCardProps = {
  title: string;
  /** Optional one-line summary shown under the title (e.g. "129 sets/week"). */
  summary?: string;
  defaultExpanded?: boolean;
  /** Base testID. Header is `${testID}-header`, body is `${testID}-body`. */
  testID: string;
  children: React.ReactNode;
};

export function CollapsibleCard({
  title,
  summary,
  defaultExpanded = false,
  testID,
  children,
}: CollapsibleCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const headerA11y = `${title}.${summary ? ` ${summary}.` : ""} ${
    expanded ? "Expanded" : "Collapsed"
  }. Double tap to ${expanded ? "collapse" : "expand"}`;

  return (
    <View style={styles.card} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={headerA11y}
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        testID={`${testID}-header`}
      >
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {summary ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.chevron, expanded && styles.chevronOpen]} accessible={false}>
          {"\u203A"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.body} testID={`${testID}-body`}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
  },
  headerPressed: {
    opacity: 0.9,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  summary: {
    fontSize: 13,
    color: UI_TEXT_SECONDARY,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
    transform: [{ rotate: "90deg" }],
  },
  chevronOpen: {
    transform: [{ rotate: "-90deg" }],
    color: UI_TEXT_PRIMARY,
  },
  body: {
    paddingBottom: 12,
    gap: 2,
  },
});
