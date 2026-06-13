// lib/ui/program/WeeklySplitSetupScreen.tsx
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ProgrammingSplitDay } from "@/lib/data/program/programmingEngineTypes";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_APP_SCREEN_BG,
  UI_GROUPED_CARD_RADIUS,
  UI_SURFACE_PRESSED,
  UI_TAB_ROOT_INSET,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type WeeklySplitSetupScreenProps = {
  /** True once the program is generatable; false shows the completion hint. */
  available: boolean;
  /** Number of training days driving the generated split (from the Training Days category). */
  dayCount: number | null;
  /** Generated day structure; names are editable and overrides are flagged. */
  days: ProgrammingSplitDay[];
  /** Hint shown when `available` is false. */
  missingHint: string;
  onChangeDayName: (dayId: string, name: string) => void;
};

/**
 * Weekly Split editor. The day count comes from the Training Days category, so this screen shows the
 * engine-generated split structure and lets the user rename any day. Renamed days are flagged
 * "Edited" and persist across regeneration. Wrapped in KeyboardAvoidingView so inputs stay visible.
 */
export function WeeklySplitSetupScreen({
  available,
  dayCount,
  days,
  missingHint,
  onChangeDayName,
}: WeeklySplitSetupScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        accessibilityLabel="Weekly Split"
      >
        {!available ? (
          <View style={styles.hintCard} testID="weekly-split-empty-hint">
            <Text style={styles.hintTitle}>No split generated yet</Text>
            <Text style={styles.hintBody}>{missingHint}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.description}>
              Your generated {dayCount}-day split. Rename any day to match your preferences.
            </Text>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Training days</Text>
              {days.map((day, index) => (
                <View
                  key={day.id}
                  testID={`weekly-split-day-${day.id}`}
                  style={[styles.dayRow, index > 0 && styles.dayRowDivider]}
                >
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayIndex}>Day {index + 1}</Text>
                    {day.source === "manual" ? (
                      <Text style={styles.editedBadge} testID={`weekly-split-edited-${day.id}`}>
                        Edited
                      </Text>
                    ) : null}
                  </View>
                  <TextInput
                    testID={`weekly-split-day-input-${day.id}`}
                    value={day.name}
                    onChangeText={(text) => onChangeDayName(day.id, text)}
                    placeholder="e.g. Push, Pull, Legs"
                    placeholderTextColor={UI_TEXT_MUTED}
                    style={styles.dayInput}
                    returnKeyType="done"
                    accessibilityLabel={`Day ${index + 1} name`}
                    maxLength={40}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  content: {
    paddingHorizontal: UI_TAB_ROOT_INSET,
    paddingTop: 12,
    gap: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
  },
  hintCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 6,
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  hintBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dayRow: {
    paddingVertical: 12,
    gap: 8,
  },
  dayRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayIndex: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
  editedBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dayInput: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
    backgroundColor: UI_SURFACE_PRESSED,
  },
});
