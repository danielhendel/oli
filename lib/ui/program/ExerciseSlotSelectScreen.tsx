// lib/ui/program/ExerciseSlotSelectScreen.tsx
// Dedicated exercise selection page: searchable library options with truthful detail fields.
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramExerciseDetails } from "@/lib/data/program/getProgramExerciseDetails";
import type { ProgramExerciseOption } from "@/lib/data/program/programExerciseRecommendationTypes";
import { searchProgramExerciseOptions } from "@/lib/data/program/searchProgramExerciseOptions";
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

export type ExerciseSlotSelectScreenProps = {
  muscleLabel: string;
  slotPosition: number;
  /** Currently selected exercise id for this slot, if any. */
  selectedExerciseId: string | null;
  options: ProgramExerciseOption[];
  getDetails: (exerciseId: string) => ProgramExerciseDetails;
  onSelect: (exerciseId: string) => void;
};

function ExerciseOptionRow({
  option,
  details,
  isSelected,
  onSelect,
}: {
  option: ProgramExerciseOption;
  details: ProgramExerciseDetails;
  isSelected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const metaParts: string[] = [];
  if (details.equipment != null) metaParts.push(details.equipment);
  if (details.movement != null) metaParts.push(details.movement);
  metaParts.push(details.loggingType);
  if (option.origin === "custom") metaParts.push("Custom");
  if (!option.isPrimaryMatch) metaParts.push("Assisting");

  const primaryLine =
    details.primaryMuscles.length > 0
      ? `Primary: ${details.primaryMuscles.join(", ")}`
      : null;
  const secondaryLine =
    details.secondaryMuscles.length > 0
      ? `Secondary: ${details.secondaryMuscles.join(", ")}`
      : null;

  return (
    <Pressable
      testID={`exercise-select-option-${option.exerciseId}`}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityLabel={`${option.name}${isSelected ? ", Selected exercise" : ""}`}
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [styles.optionCard, pressed && styles.optionPressed]}
    >
      <View style={styles.optionHeader}>
        <Text style={styles.optionName} numberOfLines={2}>
          {option.name}
        </Text>
        {isSelected ? <Ionicons name="checkmark-circle" size={22} color={SYSTEM_ACCENT} /> : null}
      </View>
      <Text style={styles.optionMeta} numberOfLines={1}>
        {metaParts.join(" · ")}
      </Text>
      {primaryLine != null ? (
        <Text style={styles.optionDetail} numberOfLines={2}>
          {primaryLine}
        </Text>
      ) : null}
      {secondaryLine != null ? (
        <Text style={styles.optionDetail} numberOfLines={2}>
          {secondaryLine}
        </Text>
      ) : null}
      {details.description != null ? (
        <Text style={styles.optionDescription} numberOfLines={3}>
          {details.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Exercise selection page for one slot. Shows library exercises with truthful available fields
 * (name, muscles, equipment, movement, logging type, library description when present). The user
 * taps an option to select it; the caller persists the stable exercise id and navigates back.
 */
export function ExerciseSlotSelectScreen({
  muscleLabel,
  slotPosition,
  selectedExerciseId,
  options,
  getDetails,
  onSelect,
}: ExerciseSlotSelectScreenProps): React.ReactElement {
  const scrollPaddingBottom = useFloatingTabBarScrollPadding(40);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => searchProgramExerciseOptions({ options, getDetails, query }),
    [options, getDetails, query],
  );

  const hasLibraryOptions = options.length > 0;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityLabel={`Select exercise for ${muscleLabel}`}
      testID="exercise-slot-select-screen"
    >
      <Text style={styles.description}>
        Choose an exercise for {muscleLabel}, slot {slotPosition}. Only fields from the exercise
        library are shown.
      </Text>

      {hasLibraryOptions ? (
        <View style={styles.searchRow} testID="exercise-select-search-row">
          <Ionicons name="search" size={18} color={UI_TEXT_MUTED} />
          <TextInput
            testID="exercise-select-search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            placeholderTextColor={UI_TEXT_MUTED}
            style={styles.searchInput}
            accessibilityLabel="Search exercises"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}

      {!hasLibraryOptions ? (
        <View style={styles.emptyCard} testID="exercise-select-empty">
          <Text style={styles.emptyText}>
            No exercises in the library target this muscle group yet.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard} testID="exercise-select-no-matches">
          <Text style={styles.emptyTitle}>No matching exercises</Text>
          <Text style={styles.emptyText}>
            Try clearing your search or changing filters to see more exercises.
          </Text>
        </View>
      ) : (
        <View style={styles.list} testID="exercise-select-list">
          {filtered.map((option) => (
            <ExerciseOptionRow
              key={option.exerciseId}
              option={option}
              details={getDetails(option.exerciseId)}
              isSelected={option.exerciseId === selectedExerciseId}
              onSelect={() => onSelect(option.exerciseId)}
            />
          ))}
        </View>
      )}
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
    paddingTop: 12,
    gap: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  list: {
    gap: 10,
  },
  optionCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 14,
    gap: 6,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  optionName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  optionMeta: {
    fontSize: 13,
    color: UI_TEXT_MUTED,
  },
  optionDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: UI_SURFACE_PRESSED,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: UI_TEXT_PRIMARY,
    paddingVertical: 10,
  },
  emptyCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 15,
    color: UI_TEXT_MUTED,
    textAlign: "center",
  },
});
