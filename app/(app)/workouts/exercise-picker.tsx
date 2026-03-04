/**
 * Exercise Picker — full-screen route for selecting an exercise to add to a workout session.
 * Offline-first, deterministic, no timers/network. Returns selection via router.replace to log.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  ListRenderItem,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EXERCISE_CATALOG_V1 } from "@/lib/workouts/exercises/catalog";
import { searchExercises } from "@/lib/workouts/exercises/search";
import { buildExerciseLibrarySections } from "@/lib/workouts/exercises/librarySections";
import { getExerciseMeta } from "@/lib/workouts/exercises/metadata";

type Equipment = "any" | "barbell" | "dumbbell" | "machine" | "bodyweight";
type Muscle = "any" | "chest" | "back" | "legs" | "shoulders" | "biceps" | "triceps" | "core";
type Movement = "any" | "push" | "pull" | "squat" | "hinge" | "carry" | "core" | "isolation";
type TrainingType =
  | "any"
  | "strength"
  | "power"
  | "mobility"
  | "functional"
  | "conditioning"
  | "isolation";

type ExerciseFilters = {
  equipment: Equipment;
  primary: Muscle;
  movement: Movement;
  trainingType: TrainingType;
};

const DEFAULT_FILTERS: ExerciseFilters = {
  equipment: "any",
  primary: "any",
  movement: "any",
  trainingType: "any",
};

type TabId = "all" | "recent" | "popular";

type ListEntry =
  | { type: "header" }
  | { type: "row"; exerciseId: string }
  | { type: "custom"; exerciseId: string };

function normForHighlight(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensForHighlight(query: string): string[] {
  const norm = normForHighlight(query);
  if (!norm) return [];
  const tokens = norm.split(" ").filter((t) => t.length >= 2);
  return [...tokens].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

/** Returns merged non-overlapping [start, end) ranges in ascending order. */
function buildHighlightRanges(text: string, tokens: string[]): [number, number][] {
  if (tokens.length === 0) return [];
  const textLower = text.toLowerCase();
  const raw: [number, number][] = [];
  for (const token of tokens) {
    let pos = 0;
    for (;;) {
      const i = textLower.indexOf(token, pos);
      if (i === -1) break;
      raw.push([i, i + token.length]);
      pos = i + 1;
    }
  }
  if (raw.length === 0) return [];
  raw.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [raw[0]!];
  for (let i = 1; i < raw.length; i++) {
    const [s, e] = raw[i]!;
    const last = merged[merged.length - 1]!;
    if (s <= last[1]) {
      if (e > last[1]) last[1] = e;
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

function renderHighlightedText(
  text: string,
  queryTokens: string[],
  styleRef: { rowTitle: object; rowTitleText: object; rowTitleHit: object },
): React.ReactElement {
  const ranges = buildHighlightRanges(text, queryTokens);
  if (ranges.length === 0) {
    return <Text style={styleRef.rowTitle}>{text}</Text>;
  }
  const segments: React.ReactNode[] = [];
  let pos = 0;
  let keyIdx = 0;
  for (const [start, end] of ranges) {
    if (start > pos) {
      segments.push(
        <Text key={`s-${keyIdx++}`} style={styleRef.rowTitleText}>
          {text.slice(pos, start)}
        </Text>,
      );
    }
    segments.push(
      <Text key={`s-${keyIdx++}`} style={styleRef.rowTitleHit}>
        {text.slice(start, end)}
      </Text>,
    );
    pos = end;
  }
  if (pos < text.length) {
    segments.push(
      <Text key={`s-${keyIdx++}`} style={styleRef.rowTitleText}>
        {text.slice(pos)}
      </Text>,
    );
  }
  return <Text style={styleRef.rowTitle}>{segments}</Text>;
}

function sanitizeExerciseId(name: string): string | null {
  const s = name.trim().toLowerCase();
  if (!s) return null;
  const slug = s
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug) return null;
  if (slug.length > 64) return slug.slice(0, 64);
  return slug;
}

function passesFilters(exerciseId: string, filters: ExerciseFilters): boolean {
  const meta = getExerciseMeta(exerciseId);
  const equipmentLower = meta.equipment.toLowerCase();
  const primaryLower = meta.primary.toLowerCase();
  if (filters.equipment !== "any" && equipmentLower !== filters.equipment) return false;
  if (filters.primary !== "any" && primaryLower !== filters.primary) return false;
  if (filters.movement !== "any" && meta.movement !== filters.movement) return false;
  if (filters.trainingType !== "any" && meta.trainingType !== filters.trainingType) return false;
  return true;
}

function activeFilterCount(filters: ExerciseFilters): number {
  let n = 0;
  if (filters.equipment !== "any") n++;
  if (filters.primary !== "any") n++;
  if (filters.movement !== "any") n++;
  if (filters.trainingType !== "any") n++;
  return n;
}

const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "machine", label: "Machine" },
  { value: "bodyweight", label: "Bodyweight" },
];

const MUSCLE_OPTIONS: { value: Muscle; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "legs", label: "Legs" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "core", label: "Core" },
];

const MOVEMENT_OPTIONS: { value: Movement; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "squat", label: "Squat" },
  { value: "hinge", label: "Hinge" },
  { value: "carry", label: "Carry" },
  { value: "core", label: "Core" },
  { value: "isolation", label: "Isolation" },
];

const TRAINING_TYPE_OPTIONS: { value: TrainingType; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "strength", label: "Strength" },
  { value: "power", label: "Power" },
  { value: "mobility", label: "Mobility" },
  { value: "functional", label: "Functional" },
  { value: "conditioning", label: "Conditioning" },
  { value: "isolation", label: "Isolation" },
];

export default function ExercisePickerScreen() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; blockId?: string }>();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : undefined;
  const blockId = typeof params.blockId === "string" ? params.blockId : undefined;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ExerciseFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [sections, setSections] = useState<{ recentIds: string[]; popularIds: string[] }>({
    recentIds: [],
    popularIds: [],
  });

  const isSignedIn = Boolean(user) && !initializing;

  useEffect(() => {
    if (!user || initializing) return;
    let cancelled = false;
    buildExerciseLibrarySections(user.uid)
      .catch(() => ({ recentIds: [], popularIds: [] }))
      .then((sec) => {
        if (!cancelled) setSections(sec);
      });
    return () => {
      cancelled = true;
    };
  }, [user, initializing]);

  const allSorted = useMemo(
    () =>
      [...EXERCISE_CATALOG_V1].sort((a, b) => {
        const nameCmp = a.name.localeCompare(b.name);
        if (nameCmp !== 0) return nameCmp;
        return a.exerciseId.localeCompare(b.exerciseId);
      }),
    [],
  );

  const searchResults = useMemo(
    () => (query.trim() ? searchExercises(EXERCISE_CATALOG_V1, query, 20) : []),
    [query],
  );
  const filteredSearchResults = useMemo(
    () => searchResults.filter((e) => passesFilters(e.exerciseId, filters)),
    [searchResults, filters],
  );

  const filteredAllSorted = useMemo(
    () => allSorted.filter((e) => passesFilters(e.exerciseId, filters)),
    [allSorted, filters],
  );

  const activeFilterCountNum = activeFilterCount(filters);

  const customExerciseId = useMemo(() => sanitizeExerciseId(query), [query]);

  const catalogNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const item of EXERCISE_CATALOG_V1) m[item.exerciseId] = item.name;
    return m;
  }, []);

  const recentDisplayIds = sections.recentIds;
  const popularDisplayIds = useMemo(
    () => sections.popularIds.filter((id) => !sections.recentIds.includes(id)),
    [sections.popularIds, sections.recentIds],
  );

  const onAddToWorkout = useCallback(
    (exerciseId: string) => {
      if (sessionId == null) return;
      setSelectedExerciseId(null);
      const logParams: Record<string, string> = { sessionId, pickedExerciseId: exerciseId };
      if (blockId != null) logParams.blockId = blockId;
      router.replace({
        pathname: "/(app)/workouts/log",
        params: logParams,
      });
    },
    [sessionId, blockId, router],
  );

  const listData = useMemo((): ListEntry[] => {
    const hasQuery = query.trim() !== "";
    const entries: ListEntry[] = [{ type: "header" }];

    if (hasQuery) {
      for (const e of filteredSearchResults) {
        entries.push({ type: "row", exerciseId: e.exerciseId });
      }
      if (filteredSearchResults.length === 0 && customExerciseId) {
        entries.push({ type: "custom", exerciseId: customExerciseId });
      }
    } else {
      if (activeTab === "all") {
        for (const e of filteredAllSorted) {
          entries.push({ type: "row", exerciseId: e.exerciseId });
        }
      } else if (activeTab === "recent") {
        for (const id of recentDisplayIds) {
          entries.push({ type: "row", exerciseId: id });
        }
      } else {
        for (const id of popularDisplayIds) {
          entries.push({ type: "row", exerciseId: id });
        }
      }
    }
    return entries;
  }, [
    query,
    activeTab,
    filteredSearchResults,
    customExerciseId,
    recentDisplayIds,
    popularDisplayIds,
    filteredAllSorted,
  ]);

  const listRowCount = listData.length - 1;
  const showMicroline = query.trim() !== "" || activeFilterCountNum > 0;
  const microlineParts = useMemo((): string[] => {
    if (!showMicroline) return [];
    const parts: string[] = ["Showing", String(listRowCount)];
    if (activeFilterCountNum > 0) parts.push(`${activeFilterCountNum} filters`);
    if (query.trim() !== "") parts.push("Search");
    return parts;
  }, [showMicroline, listRowCount, activeFilterCountNum, query]);
  const microlineText = microlineParts.length > 0 ? microlineParts.join(" · ") : "";

  const getRowName = useCallback(
    (exerciseId: string, isCustom: boolean): string => {
      if (isCustom) return `Add custom ${exerciseId}`;
      return catalogNameById[exerciseId] ?? exerciseId;
    },
    [catalogNameById],
  );

  const renderHeaderContent = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Text style={styles.magnifier}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search exercises"
            style={styles.input}
            accessibilityLabel="Exercise search"
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setIsFilterOpen(true)}
            style={styles.filterButton}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <Text style={styles.filterIcon}>Filter</Text>
            {activeFilterCountNum > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{String(activeFilterCountNum)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <View style={styles.tabRow}>
          {(["all", "recent", "popular"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.chip, activeTab === tab && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Tab ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            >
              <Text style={[styles.chipText, activeTab === tab && styles.chipTextSelected]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        {showMicroline && microlineText ? (
          <Text style={styles.microline}>{microlineText}</Text>
        ) : null}
      </View>
    ),
    [query, activeTab, showMicroline, microlineText, activeFilterCountNum],
  );

  const renderItem: ListRenderItem<ListEntry> = useCallback(
    ({ item: entry, index }) => {
      if (entry.type === "header") {
        return renderHeaderContent();
      }
      const isFirstRow = index === 1;
      const isLastRow = index === listData.length - 1;
      const listItemStyle = [
        styles.listItem,
        isFirstRow && styles.listItemFirst,
        isLastRow && styles.listItemLast,
      ];
      const isCustom = entry.type === "custom";
      const exerciseId = entry.exerciseId;
      const name = getRowName(exerciseId, isCustom);
      const meta = getExerciseMeta(exerciseId);
      const subtitle = `${meta.equipment} · ${meta.primary}`;

      const showHighlight = query.trim() !== "" && entry.type === "row";
      const titleNode = showHighlight
        ? renderHighlightedText(name, tokensForHighlight(query), styles)
        : <Text style={styles.rowTitle}>{name}</Text>;

      return (
        <Pressable
          onPress={() => setSelectedExerciseId(exerciseId)}
          onLongPress={() => {
            if (sessionId != null) onAddToWorkout(exerciseId);
          }}
          style={[styles.row, listItemStyle]}
          accessibilityRole="button"
          accessibilityLabel={`Pick ${name}`}
        >
          {titleNode}
          <Text style={styles.rowMeta}>{subtitle}</Text>
        </Pressable>
      );
    },
    [getRowName, listData.length, query, sessionId, onAddToWorkout, renderHeaderContent],
  );

  const keyExtractor = useCallback((item: ListEntry, index: number): string => {
    if (item.type === "header") return "header-0";
    return `${item.type}-${item.exerciseId}-${index}`;
  }, []);

  if (!isSignedIn) {
    return (
      <View style={styles.screen}>
        <EmptyState title="Sign in to add exercises" description="Sign in to use the exercise picker." />
      </View>
    );
  }

  const selectedMeta = selectedExerciseId ? getExerciseMeta(selectedExerciseId) : null;
  const selectedName = selectedExerciseId
    ? (catalogNameById[selectedExerciseId] ?? `Add custom ${selectedExerciseId}`)
    : "";

  return (
    <View style={styles.screen}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        stickyHeaderIndices={[0]}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          listRowCount === 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowTitle}>No results</Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={isFilterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <Pressable style={styles.filterBackdrop} onPress={() => setIsFilterOpen(false)}>
          <Pressable style={styles.filterPanel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterPanelTitle}>Filters</Text>
            <Text style={styles.filterSectionLabel}>Equipment</Text>
            <View style={styles.filterChipRow}>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setFilters((prev) => ({ ...prev, equipment: opt.value }))}
                  style={[styles.filterChip, filters.equipment === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Equipment ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.equipment === opt.value && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.filterSectionLabel}>Primary muscle</Text>
            <View style={styles.filterChipRow}>
              {MUSCLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setFilters((prev) => ({ ...prev, primary: opt.value }))}
                  style={[styles.filterChip, filters.primary === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Primary muscle ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.primary === opt.value && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.filterSectionLabel}>Movement pattern</Text>
            <View style={styles.filterChipRow}>
              {MOVEMENT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setFilters((prev) => ({ ...prev, movement: opt.value }))}
                  style={[styles.filterChip, filters.movement === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Movement ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.movement === opt.value && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.filterSectionLabel}>Exercise type</Text>
            <View style={styles.filterChipRow}>
              {TRAINING_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, trainingType: opt.value }))
                  }
                  style={[
                    styles.filterChip,
                    filters.trainingType === opt.value && styles.chipSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Exercise type ${opt.label}`}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.trainingType === opt.value && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.filterPanelActions}>
              <Pressable
                onPress={() => setFilters(DEFAULT_FILTERS)}
                style={styles.filterClearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <Text style={styles.filterClearText}>Clear</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsFilterOpen(false)}
                style={styles.filterDoneButton}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text style={styles.filterDoneText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={selectedExerciseId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExerciseId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedExerciseId(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedExerciseId && selectedMeta && (
              <>
                <Text style={styles.modalTitle}>{selectedName}</Text>
                <Text style={styles.modalMeta}>
                  {selectedMeta.equipment} · {selectedMeta.primary}
                </Text>
                <View style={styles.diagramPlaceholder}>
                  <Text style={styles.diagramPlaceholderText}>Diagram</Text>
                </View>
                <Text style={styles.modalDescription}>{selectedMeta.description}</Text>
                <View style={styles.cuesBlock}>
                  {selectedMeta.cues.slice(0, 3).map((cue, i) => (
                    <Text key={i} style={styles.cueItem}>
                      • {cue}
                    </Text>
                  ))}
                </View>
                {sessionId == null ? (
                  <Text style={styles.missingSessionText}>Missing session id</Text>
                ) : null}
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => sessionId != null && onAddToWorkout(selectedExerciseId)}
                    style={[styles.addButton, sessionId == null && styles.addButtonDisabled]}
                    disabled={sessionId == null}
                    accessibilityRole="button"
                    accessibilityLabel="Add to workout"
                  >
                    <Text style={styles.addButtonText}>Add to workout</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedExerciseId(null)}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  magnifier: {
    fontSize: 16,
    color: "#6E6E73",
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    color: "#1C1C1E",
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  filterButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterIcon: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  microline: {
    fontSize: 12,
    color: "#6E6E73",
    marginTop: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#E5E5EA",
  },
  chipSelected: {
    backgroundColor: "#007AFF",
  },
  chipText: {
    fontSize: 14,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  listItem: {
    backgroundColor: "#FFFFFF",
  },
  listItemFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  listItemLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  row: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  rowTitleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  rowTitleHit: { fontSize: 15, fontWeight: "800", color: "#1C1C1E" },
  rowMeta: { fontSize: 12, color: "#6E6E73", marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: 14,
    color: "#6E6E73",
    marginBottom: 12,
  },
  diagramPlaceholder: {
    height: 120,
    borderWidth: 1,
    borderColor: "#C6C6C8",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  diagramPlaceholderText: {
    fontSize: 13,
    color: "#8E8E93",
  },
  modalDescription: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginBottom: 8,
  },
  cuesBlock: {
    marginBottom: 16,
  },
  cueItem: {
    fontSize: 14,
    color: "#3A3A3C",
    lineHeight: 20,
  },
  missingSessionText: {
    fontSize: 14,
    color: "#FF3B30",
    marginBottom: 8,
  },
  modalActions: {
    gap: 10,
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#C6C6C8",
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C6C6C8",
  },
  closeButtonText: {
    fontSize: 17,
    color: "#1C1C1E",
  },
  filterBackdrop: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  filterPanel: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    padding: 20,
    paddingTop: 56,
  },
  filterPanelTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6E6E73",
    marginBottom: 8,
    marginTop: 12,
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#E5E5EA",
  },
  filterChipText: {
    fontSize: 14,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  filterPanelActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
  },
  filterClearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C6C6C8",
  },
  filterClearText: {
    fontSize: 16,
    color: "#1C1C1E",
    fontWeight: "600",
  },
  filterDoneButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  filterDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
