// lib/ui/program/WeeklySplitSetupScreen.tsx
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { WeeklySplitDay } from "@/lib/data/program/workoutProgramDesignTypes";
import { WEEKLY_SPLIT_DAY_COUNT_OPTIONS } from "@/lib/data/program/workoutProgramDesignOptions";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { useFloatingTabBarScrollPadding } from "@/lib/ui/navigation/useFloatingTabBarScrollPadding";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
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
  /** Currently selected number of training days, or null when not yet chosen. */
  dayCount: number | null;
  days: WeeklySplitDay[];
  onSelectDayCount: (count: number) => void;
  onChangeDayName: (dayId: string, name: string) => void;
};

/**
 * Weekly Split editor: first choose 2–6 training days, then name/define each day. Day names are
 * free text (e.g. "Full Body", "Push", "Legs") — examples are hints only, never hardcoded options.
 * Wrapped in KeyboardAvoidingView so inputs stay visible while typing.
 */
export function WeeklySplitSetupScreen({
  dayCount,
  days,
  onSelectDayCount,
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
        <Text style={styles.description}>
          Choose how many days you’ll train each week, then name each day.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Training days</Text>
          <View style={styles.dayCountRow}>
            {WEEKLY_SPLIT_DAY_COUNT_OPTIONS.map((count) => {
              const selected = count === dayCount;
              return (
                <Pressable
                  key={count}
                  testID={`weekly-split-day-count-${count}`}
                  onPress={() => onSelectDayCount(count)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${count} training days`}
                  style={({ pressed }) => [
                    styles.dayCountPill,
                    selected && styles.dayCountPillSelected,
                    pressed && styles.dayCountPillPressed,
                  ]}
                >
                  <Text
                    style={[styles.dayCountText, selected && styles.dayCountTextSelected]}
                  >
                    {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {dayCount == null ? (
          <Text style={styles.emptyHint}>Select a number of days to configure each one.</Text>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Configure each day</Text>
            {days.map((day, index) => (
              <View
                key={day.id}
                testID={`weekly-split-day-${day.id}`}
                style={[styles.dayRow, index > 0 && styles.dayRowDivider]}
              >
                <Text style={styles.dayIndex}>Day {index + 1}</Text>
                <TextInput
                  testID={`weekly-split-day-input-${day.id}`}
                  value={day.name}
                  onChangeText={(text) => onChangeDayName(day.id, text)}
                  placeholder="e.g. Full Body, Upper Body, Lower Body"
                  placeholderTextColor={UI_TEXT_MUTED}
                  style={styles.dayInput}
                  returnKeyType="done"
                  accessibilityLabel={`Day ${index + 1} name`}
                  maxLength={40}
                />
              </View>
            ))}
          </View>
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
  dayCountRow: {
    flexDirection: "row",
    gap: 10,
  },
  dayCountPill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI_SURFACE_PRESSED,
  },
  dayCountPillSelected: {
    backgroundColor: SYSTEM_ACCENT_FILL_14,
    borderWidth: 1,
    borderColor: SYSTEM_ACCENT,
  },
  dayCountPillPressed: {
    opacity: 0.7,
  },
  dayCountText: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_SECONDARY,
  },
  dayCountTextSelected: {
    color: UI_TEXT_PRIMARY,
  },
  emptyHint: {
    fontSize: 14,
    color: UI_TEXT_MUTED,
    textAlign: "center",
    paddingVertical: 8,
  },
  dayRow: {
    paddingVertical: 12,
    gap: 8,
  },
  dayRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  dayIndex: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
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
