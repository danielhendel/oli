// lib/ui/program/ProgramCurrentScreen.tsx
// Program tab body: the user's current programs in progress. v1 has no persistence, so this renders
// a clean explainer empty state. Built to grow into program progress/tracking — pass real programs
// and this screen will list them without changing shape.
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramSummary } from "@/lib/data/program/types";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

export type ProgramCurrentScreenProps = {
  /** Programs the user is currently running. Empty in v1 (no persistence). */
  programs: ProgramSummary[];
  /** When true, omit outer ScrollView (parent owns scroll). */
  embedded?: boolean;
};

export function ProgramCurrentScreen({
  programs,
  embedded = false,
}: ProgramCurrentScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const isEmpty = programs.length === 0;

  const body = isEmpty ? (
    <View
      style={styles.emptyCard}
      testID="program-current-empty"
      accessibilityLabel="No active programs yet. Tap the plus button to build one."
    >
      <View style={styles.iconWrap}>
        <Ionicons name="albums-outline" size={24} color={SYSTEM_ACCENT} />
      </View>
      <Text style={styles.emptyTitle}>No active programs yet</Text>
      <Text style={styles.emptyBody}>
        Programs you build will show up here so you can track your progress. Tap{" "}
        <Text style={styles.emptyAccent}>+</Text> to open the builders and start one.
      </Text>
    </View>
  ) : (
    <View style={styles.list} testID="program-current-list">
      {programs.map((program) => (
        <View
          key={program.id}
          style={styles.programCard}
          testID={`program-current-card-${program.id}`}
          accessibilityLabel={`Program, ${program.name}`}
        >
          <Text style={styles.programName}>{program.name}</Text>
        </View>
      ))}
    </View>
  );

  if (embedded) {
    return body;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Program"
    >
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 4,
    gap: 12,
  },
  emptyCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 20,
    gap: 10,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  emptyAccent: {
    fontWeight: "800",
    color: SYSTEM_ACCENT,
  },
  list: {
    gap: 12,
  },
  programCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
  },
  programName: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
});
