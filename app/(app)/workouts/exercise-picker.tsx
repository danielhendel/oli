/**
 * Exercise Picker — full-screen route for selecting an exercise to add to a workout session.
 * Offline-first, deterministic, no timers/network. Returns selection via router.replace to log or enrich.
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
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { EmptyState } from "@/lib/ui/ScreenStates";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { EXERCISE_CATALOG_FOR_PICKER_V1 } from "@/lib/workouts/exercises/catalog";
import { EXERCISE_LIBRARY_V1 } from "@/lib/workouts/exercises/library.v1";
import { bundledCatalogItemsForWorkoutPicker } from "@/lib/workouts/exercises/pickerBundledCatalog";
import { isUserScopedCustomExerciseId } from "@oli/contracts";
import { getGymLabel, isExerciseAvailableAtGym } from "@/lib/workouts/gymRegistry";
import { searchExercises } from "@/lib/workouts/exercises/search";
import { buildExerciseLibrarySections } from "@/lib/workouts/exercises/librarySections";
import { getExerciseMeta } from "@/lib/workouts/exercises/metadata";
import type { ExerciseMeta } from "@/lib/workouts/exercises/metadata";
import { getBundledExerciseAsset, hasBundledExerciseAsset } from "@/lib/workouts/exercises/media/registry";
import { ExerciseMediaPreview } from "@/components/workouts/ExerciseMediaPreview";
import { ThumbnailPlaceholderView } from "@/components/workouts/ThumbnailPlaceholderView";
import {
  createCustomExerciseSeededFromBundled,
  type CustomExerciseRecord,
} from "@/lib/workouts/exercises/customExerciseStore";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import { createExerciseDefinition } from "@/lib/api/exerciseDefinitions";
import { migrateLocalCustomExercisesToBackend } from "@/lib/workouts/exercises/migrateCustomExercisesToBackend";
import { normalizeStrengthLoggingType } from "@/lib/workouts/exercises/loggingType";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

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

function isSupportedLoggingTypeForPicker(value: string): boolean {
  return value === "weight_reps" || value === "bodyweight_reps" || value === "reps_only";
}

type TabId = "all" | "recent" | "myGym";

type ListEntry =
  | { type: "header" }
  | { type: "row"; exerciseId: string };

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

function passesFilters(meta: ExerciseMeta, filters: ExerciseFilters): boolean {
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

function customMetaFromRecord(record: CustomExerciseRecord): ExerciseMeta {
  return {
    equipment: record.equipment,
    primary: record.primary === "Other" ? "Full body" : record.primary,
    movement: record.movementPattern ?? "isolation",
    trainingType: "strength",
    cues: [
      "Move with control",
      "Use a stable setup",
      "Log consistently for progress tracking",
    ],
    description: `${record.name} is a custom exercise created for your training flow.`,
    primaryCoarse: ["FullBody"],
    secondaryCoarse: [],
    primaryDetailed: [],
    secondaryDetailed: [],
  };
}

function customSubtitle(record: CustomExerciseRecord): string {
  return `Custom · ${record.equipment} · ${record.primary}`;
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
  const { user, initializing, getIdToken } = useAuth();
  const { state: prefState } = usePreferences();
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("task"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);
  const params = useLocalSearchParams<{
    sessionId?: string;
    blockId?: string;
    gymId?: string;
    /** When "enrich", replace back to /workouts/enrich with enrich* params preserved. */
    logReturnPath?: string;
    enrichDay?: string;
    enrichTargetId?: string;
    sessionAnchorIso?: string;
    journalSessionId?: string;
  }>();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : undefined;
  const blockId = typeof params.blockId === "string" ? params.blockId : undefined;
  const workoutFlowGymId = typeof params.gymId === "string" ? params.gymId : null;

  /** My Gym tab: workout-flow gym (from log screen) first, then persisted preference. */
  const effectiveGymId =
    workoutFlowGymId ?? prefState.preferences?.selectedGymId ?? null;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ExerciseFilters>(DEFAULT_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [customizeInFlight, setCustomizeInFlight] = useState(false);
  const [sections, setSections] = useState<{ recentIds: string[]; popularIds: string[] }>({
    recentIds: [],
    popularIds: [],
  });
  const [customExercises, setCustomExercises] = useState<CustomExerciseRecord[]>([]);

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

  useEffect(() => {
    if (!user || initializing) return;
    let cancelled = false;
    const loadMerged = (): Promise<void> =>
      listMergedCustomExerciseRecords(user.uid, () => getIdToken(false))
        .catch(() => [])
        .then((rows) => {
          if (!cancelled) {
            setCustomExercises(
              rows
                .filter((row) => isSupportedLoggingTypeForPicker(row.loggingType))
                .map((row) => ({ ...row, loggingType: normalizeStrengthLoggingType(row.loggingType) })),
            );
          }
        });

    void loadMerged().then(() => {
      if (cancelled) return;
      void migrateLocalCustomExercisesToBackend(user.uid, () => getIdToken(false)).then(() => {
        if (cancelled) return;
        void loadMerged();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [user, initializing, getIdToken]);

  const customById = useMemo(() => {
    const m = new Map<string, CustomExerciseRecord>();
    for (const row of customExercises) m.set(row.exerciseId, row);
    return m;
  }, [customExercises]);

  /** Optional per-user restriction: only these bundled ids (plus all custom exercises). */
  const workoutPickerBundledAllowlist = prefState.preferences.workoutPickerBundledAllowlistExerciseIds;

  const bundledCatalogForPicker = useMemo(
    () =>
      bundledCatalogItemsForWorkoutPicker(
        EXERCISE_CATALOG_FOR_PICKER_V1,
        workoutPickerBundledAllowlist == null ? undefined : workoutPickerBundledAllowlist,
      ),
    [workoutPickerBundledAllowlist],
  );

  const mergedCatalog = useMemo(
    () => [
      ...bundledCatalogForPicker,
      ...customExercises.map((row) => ({
        exerciseId: row.exerciseId,
        name: row.name,
        aliases: row.aliases != null && row.aliases.length > 0 ? [...row.aliases, row.name] : [row.name],
      })),
    ],
    [bundledCatalogForPicker, customExercises],
  );

  const allSorted = useMemo(
    () =>
      [...mergedCatalog].sort((a, b) => {
        const nameCmp = a.name.localeCompare(b.name);
        if (nameCmp !== 0) return nameCmp;
        return a.exerciseId.localeCompare(b.exerciseId);
      }),
    [mergedCatalog],
  );

  const searchResults = useMemo(
    () => (query.trim() ? searchExercises(mergedCatalog, query, 20) : []),
    [query, mergedCatalog],
  );
  /** All / Recent: search filtered by equipment/muscle/etc only. My Gym: also filtered by gym. */
  const displaySearchResults = useMemo(() => {
    const byFilters = searchResults.filter((e) =>
      passesFilters(
        customById.get(e.exerciseId)
          ? customMetaFromRecord(customById.get(e.exerciseId)!)
          : getExerciseMeta(e.exerciseId),
        filters,
      ),
    );
    if (activeTab === "myGym" && effectiveGymId != null) {
      return byFilters.filter((e) => isExerciseAvailableAtGym(effectiveGymId, e.exerciseId));
    }
    return byFilters;
  }, [searchResults, filters, activeTab, effectiveGymId, customById]);

  /** All tab: full catalog, filters only. No gym restriction. */
  const allDisplaySorted = useMemo(
    () =>
      allSorted.filter((e) =>
        passesFilters(
          customById.get(e.exerciseId)
            ? customMetaFromRecord(customById.get(e.exerciseId)!)
            : getExerciseMeta(e.exerciseId),
          filters,
        ),
      ),
    [allSorted, filters, customById],
  );

  /** My Gym tab only: catalog filtered by gym + filters. */
  const myGymFilteredAll = useMemo(
    () =>
      allSorted.filter(
        (e) =>
          passesFilters(
            customById.get(e.exerciseId)
              ? customMetaFromRecord(customById.get(e.exerciseId)!)
              : getExerciseMeta(e.exerciseId),
            filters,
          ) && isExerciseAvailableAtGym(effectiveGymId, e.exerciseId),
      ),
    [allSorted, filters, effectiveGymId, customById],
  );

  const activeFilterCountNum = activeFilterCount(filters);

  const catalogNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of EXERCISE_LIBRARY_V1) m[row.exerciseId] = row.name;
    for (const row of customExercises) m[row.exerciseId] = row.name;
    return m;
  }, [customExercises]);

  /** Recent tab: recent IDs only. No gym restriction. */
  const recentDisplayIds = sections.recentIds;

  const mergedCatalogExerciseIdSet = useMemo(
    () => new Set(mergedCatalog.map((x) => x.exerciseId)),
    [mergedCatalog],
  );

  /** Drops bundled ids not in the merged picker catalog (e.g. allowlisted picker). */
  const recentIdsForPicker = useMemo(
    () => recentDisplayIds.filter((id) => mergedCatalogExerciseIdSet.has(id)),
    [recentDisplayIds, mergedCatalogExerciseIdSet],
  );

  const onAddToWorkout = useCallback(
    (exerciseId: string) => {
      if (sessionId == null) return;
      setSelectedExerciseId(null);
      const returnToEnrich = params.logReturnPath === "enrich";
      const pathname = returnToEnrich ? "/(app)/workouts/enrich" : "/(app)/workouts/log";
      const logParams: Record<string, string> = { sessionId, pickedExerciseId: exerciseId };
      if (blockId != null) logParams.blockId = blockId;
      if (returnToEnrich) {
        const d = typeof params.enrichDay === "string" ? params.enrichDay : "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) logParams.enrichDay = d;
        const t = typeof params.enrichTargetId === "string" ? params.enrichTargetId.trim() : "";
        if (t.length > 0) logParams.enrichTargetId = t;
        const a = typeof params.sessionAnchorIso === "string" ? params.sessionAnchorIso.trim() : "";
        if (a.length > 0) logParams.sessionAnchorIso = a;
        const j = typeof params.journalSessionId === "string" ? params.journalSessionId.trim() : "";
        if (j.length > 0) logParams.journalSessionId = j;
      }
      router.replace({
        pathname,
        params: logParams,
      });
    },
    [
      sessionId,
      blockId,
      router,
      params.logReturnPath,
      params.enrichDay,
      params.enrichTargetId,
      params.sessionAnchorIso,
      params.journalSessionId,
    ],
  );

  const onOpenCreateExercise = useCallback(() => {
    if (sessionId == null) return;
    const nextParams: Record<string, string> = { sessionId };
    if (blockId != null) nextParams.blockId = blockId;
    if (params.logReturnPath === "enrich") {
      nextParams.logReturnPath = "enrich";
      const d = typeof params.enrichDay === "string" ? params.enrichDay : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) nextParams.enrichDay = d;
      const t = typeof params.enrichTargetId === "string" ? params.enrichTargetId.trim() : "";
      if (t.length > 0) nextParams.enrichTargetId = t;
      const a = typeof params.sessionAnchorIso === "string" ? params.sessionAnchorIso.trim() : "";
      if (a.length > 0) nextParams.sessionAnchorIso = a;
      const j = typeof params.journalSessionId === "string" ? params.journalSessionId.trim() : "";
      if (j.length > 0) nextParams.journalSessionId = j;
    }
    router.push({ pathname: "/(app)/workouts/exercise-create", params: nextParams });
  }, [
    sessionId,
    blockId,
    params.logReturnPath,
    params.enrichDay,
    params.enrichTargetId,
    params.sessionAnchorIso,
    params.journalSessionId,
    router,
  ]);

  const onOpenEditExercise = useCallback(
    (exerciseIdToEdit: string) => {
      if (sessionId == null || user == null) return;
      if (!isUserScopedCustomExerciseId(user.uid, exerciseIdToEdit)) return;
      setSelectedExerciseId(null);
      const nextParams: Record<string, string> = { sessionId, exerciseId: exerciseIdToEdit };
      if (blockId != null) nextParams.blockId = blockId;
      if (params.logReturnPath === "enrich") {
        nextParams.logReturnPath = "enrich";
        const d = typeof params.enrichDay === "string" ? params.enrichDay : "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) nextParams.enrichDay = d;
        const t = typeof params.enrichTargetId === "string" ? params.enrichTargetId.trim() : "";
        if (t.length > 0) nextParams.enrichTargetId = t;
        const a = typeof params.sessionAnchorIso === "string" ? params.sessionAnchorIso.trim() : "";
        if (a.length > 0) nextParams.sessionAnchorIso = a;
        const j = typeof params.journalSessionId === "string" ? params.journalSessionId.trim() : "";
        if (j.length > 0) nextParams.journalSessionId = j;
      }
      router.push({ pathname: "/(app)/workouts/exercise-edit", params: nextParams });
    },
    [
      sessionId,
      blockId,
      user,
      params.logReturnPath,
      params.enrichDay,
      params.enrichTargetId,
      params.sessionAnchorIso,
      params.journalSessionId,
      router,
    ],
  );

  const onCustomizeBundledExercise = useCallback(
    async (bundledExerciseId: string) => {
      if (sessionId == null || user == null) return;
      if (customById.has(bundledExerciseId)) return;
      setCustomizeInFlight(true);
      try {
        const row = await createCustomExerciseSeededFromBundled(user.uid, bundledExerciseId);
        const token = await getIdToken(false);
        if (token) {
          void createExerciseDefinition(token, {
            name: row.name,
            equipment: row.equipment,
            primary: row.primary,
            loggingType: row.loggingType,
            exerciseId: row.exerciseId,
            ...(row.movementPattern != null ? { movementPattern: row.movementPattern } : {}),
            ...(row.aliases != null && row.aliases.length > 0 ? { aliases: row.aliases } : {}),
            ...(row.primaryMusclesDetailed != null && row.primaryMusclesDetailed.length > 0
              ? { primaryMusclesDetailed: row.primaryMusclesDetailed }
              : {}),
            ...(row.secondaryMusclesDetailed != null && row.secondaryMusclesDetailed.length > 0
              ? { secondaryMusclesDetailed: row.secondaryMusclesDetailed }
              : {}),
            ...(row.muscleContributions != null ? { muscleContributions: row.muscleContributions } : {}),
            ...(row.stability != null ? { stability: row.stability } : {}),
            ...(row.laterality != null ? { laterality: row.laterality } : {}),
          });
        }
        setSelectedExerciseId(null);
        onOpenEditExercise(row.exerciseId);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        Alert.alert("Couldn't customize exercise", message);
      } finally {
        setCustomizeInFlight(false);
      }
    },
    [sessionId, user, customById, getIdToken, onOpenEditExercise],
  );

  const listData = useMemo((): ListEntry[] => {
    const hasQuery = query.trim() !== "";
    const entries: ListEntry[] = [{ type: "header" }];

    if (hasQuery) {
      for (const e of displaySearchResults) {
        entries.push({ type: "row", exerciseId: e.exerciseId });
      }
    } else {
      if (activeTab === "all") {
        for (const e of allDisplaySorted) {
          entries.push({ type: "row", exerciseId: e.exerciseId });
        }
      } else if (activeTab === "recent") {
        for (const id of recentIdsForPicker) {
          entries.push({ type: "row", exerciseId: id });
        }
      } else {
        // My Gym tab
        if (effectiveGymId != null) {
          for (const e of myGymFilteredAll) {
            entries.push({ type: "row", exerciseId: e.exerciseId });
          }
        }
      }
    }
    return entries;
  }, [
    query,
    activeTab,
    displaySearchResults,
    recentIdsForPicker,
    allDisplaySorted,
    myGymFilteredAll,
    effectiveGymId,
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
    (exerciseId: string): string => catalogNameById[exerciseId] ?? exerciseId,
    [catalogNameById],
  );

  const renderHeaderContent = useCallback(
    () => (
      <View style={styles.header}>
        <Pressable
          onPress={onOpenCreateExercise}
          style={styles.createExerciseCta}
          accessibilityRole="button"
          accessibilityLabel="Create exercise"
        >
          <Text style={styles.createExerciseCtaText}>+ Create exercise</Text>
        </Pressable>
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
          {(["all", "recent", "myGym"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.chip, activeTab === tab && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Tab ${tab === "myGym" ? "My Gym" : tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            >
              <Text style={[styles.chipText, activeTab === tab && styles.chipTextSelected]}>
                {tab === "myGym" ? "My Gym" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        {activeTab === "myGym" ? (
          effectiveGymId != null ? (
            <>
              <Text style={styles.gymStatus} accessibilityLabel="Exercise library scope">
                {`Filtered for ${getGymLabel(effectiveGymId)}`}
              </Text>
              <Text style={styles.gymExplanation} accessibilityLabel="Gym filtering explanation">
                Showing exercises for your selected gym. Exercises that require equipment not available there are hidden.
              </Text>
            </>
          ) : (
            <Text style={styles.gymStatus} accessibilityLabel="My Gym tab hint">
              Select a gym in Start Workout to see exercises available at your location.
            </Text>
          )
        ) : (
          <Text style={styles.gymStatus} accessibilityLabel="Exercise library scope">
            My Exercise Library
          </Text>
        )}
        {showMicroline && microlineText ? (
          <Text style={styles.microline}>{microlineText}</Text>
        ) : null}
      </View>
    ),
    [
      query,
      activeTab,
      showMicroline,
      microlineText,
      activeFilterCountNum,
      effectiveGymId,
      onOpenCreateExercise,
    ],
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
      const exerciseId = entry.exerciseId;
      const custom = customById.get(exerciseId) ?? null;
      const name = getRowName(exerciseId);
      const meta = custom ? customMetaFromRecord(custom) : getExerciseMeta(exerciseId);
      const subtitle = custom ? customSubtitle(custom) : `${meta.equipment} · ${meta.primary}`;
      const hasThumbnail = !custom && hasBundledExerciseAsset(exerciseId);

      const showHighlight = query.trim() !== "" && entry.type === "row";
      const titleNode = showHighlight
        ? renderHighlightedText(name, tokensForHighlight(query), styles)
        : <Text style={styles.rowTitle}>{name}</Text>;

      const isOwnedCustom =
        user != null && custom != null && isUserScopedCustomExerciseId(user.uid, exerciseId);
      const canQuickAdd = sessionId != null;

      return (
        <View style={[styles.row, listItemStyle]}>
          <Pressable
            onPress={() => {
              if (sessionId != null) onAddToWorkout(exerciseId);
            }}
            onLongPress={
              isOwnedCustom && sessionId != null
                ? () => {
                    onOpenEditExercise(exerciseId);
                  }
                : undefined
            }
            disabled={!canQuickAdd}
            style={styles.rowMainHit}
            accessibilityRole="button"
            accessibilityLabel={`Add ${name} to workout`}
            accessibilityHint={
              isOwnedCustom && sessionId != null
                ? "Long press to edit this custom exercise"
                : "Opens actions menu from the button on the right"
            }
            accessibilityState={{ disabled: !canQuickAdd }}
          >
            {hasThumbnail ? (
              <View style={styles.rowThumbnailContainer}>
                <Image
                  source={getBundledExerciseAsset(exerciseId)}
                  style={styles.rowThumbnailImage}
                  resizeMode="contain"
                  accessibilityLabel={`${name} image`}
                />
              </View>
            ) : (
              <ThumbnailPlaceholderView width={120} height={68} />
            )}
            <View style={styles.rowContent}>
              <View style={styles.rowTitleRow}>
                {titleNode}
                {custom != null ? (
                  <View style={styles.customBadge} accessibilityLabel="Custom exercise">
                    <Text style={styles.customBadgeText}>Custom</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.rowMeta}>{subtitle}</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setSelectedExerciseId(exerciseId)}
            style={styles.rowMenuBtn}
            accessibilityRole="button"
            accessibilityLabel={`Exercise actions, ${name}`}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.rowMenuIcon} accessibilityElementsHidden>
              ⋯
            </Text>
          </Pressable>
        </View>
      );
    },
    [
      getRowName,
      listData.length,
      query,
      sessionId,
      user,
      onAddToWorkout,
      onOpenEditExercise,
      renderHeaderContent,
      customById,
    ],
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

  const selectedCustom = selectedExerciseId ? customById.get(selectedExerciseId) ?? null : null;
  const selectedMeta = selectedExerciseId
    ? selectedCustom
      ? customMetaFromRecord(selectedCustom)
      : getExerciseMeta(selectedExerciseId)
    : null;
  const selectedName = selectedExerciseId
    ? (catalogNameById[selectedExerciseId] ?? selectedExerciseId)
    : "";

  const bundledSourceExercise = useMemo(() => {
    if (selectedExerciseId == null) return null;
    return EXERCISE_LIBRARY_V1.find((x) => x.exerciseId === selectedExerciseId) ?? null;
  }, [selectedExerciseId]);

  const showGymAwareEmptyHint =
    activeTab === "myGym" &&
    effectiveGymId != null &&
    listRowCount === 0 &&
    query.trim() !== "";
  const showMyGymNoGymHint =
    activeTab === "myGym" && effectiveGymId == null && listRowCount === 0;

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
            <View style={styles.emptyStateFooter}>
              {showMyGymNoGymHint ? (
                <Text
                  style={styles.emptyStateGymHint}
                  accessibilityLabel="My Gym tab no gym selected hint"
                >
                  Select a gym in Start Workout to see exercises available at your location.
                </Text>
              ) : (
                <>
                  <Text style={styles.rowTitle}>No results</Text>
                  {showGymAwareEmptyHint ? (
                    <Text
                      style={styles.emptyStateGymHint}
                      accessibilityLabel="Gym filtering empty state hint"
                    >
                      Some exercises may be hidden because your gym doesn't have the required equipment.
                    </Text>
                  ) : null}
                </>
              )}
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
                {selectedCustom == null ? (
                  <View style={styles.modalMediaContainer}>
                    <ExerciseMediaPreview
                      exerciseId={selectedExerciseId}
                      style={styles.modalMediaFill}
                      containerBackgroundColor="#FFFFFF"
                    />
                  </View>
                ) : null}
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
                {selectedCustom == null && bundledSourceExercise != null ? (
                  <Text style={styles.modalBundledHint}>
                    Built-in exercises cannot be edited directly. Use Customize to make an editable copy in your
                    library.
                  </Text>
                ) : null}
                <View style={styles.modalActions}>
                  {selectedCustom != null &&
                  user != null &&
                  isUserScopedCustomExerciseId(user.uid, selectedExerciseId) ? (
                    <Pressable
                      onPress={() => onOpenEditExercise(selectedExerciseId)}
                      style={styles.editExerciseButton}
                      accessibilityRole="button"
                      accessibilityLabel="Edit exercise"
                    >
                      <Text style={styles.editExerciseButtonText}>Edit exercise</Text>
                    </Pressable>
                  ) : null}
                  {selectedCustom == null && bundledSourceExercise != null ? (
                    <Pressable
                      onPress={() => {
                        if (selectedExerciseId != null) void onCustomizeBundledExercise(selectedExerciseId);
                      }}
                      disabled={sessionId == null || customizeInFlight}
                      style={[
                        styles.editExerciseButton,
                        (sessionId == null || customizeInFlight) && styles.editExerciseButtonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Customize exercise"
                    >
                      {customizeInFlight ? (
                        <ActivityIndicator color={SYSTEM_ACCENT} />
                      ) : (
                        <Text style={styles.editExerciseButtonText}>Customize exercise</Text>
                      )}
                    </Pressable>
                  ) : null}
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
  createExerciseCta: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  createExerciseCtaText: {
    fontSize: 15,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
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
    color: SYSTEM_ACCENT,
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
    color: SYSTEM_ACCENT,
    fontWeight: "600",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: SYSTEM_ACCENT,
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
  gymStatus: {
    fontSize: 12,
    color: "#6E6E73",
    marginTop: 4,
  },
  gymExplanation: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 2,
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
    backgroundColor: SYSTEM_ACCENT,
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
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#C6C6C8",
  },
  rowMainHit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  rowMenuBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
    paddingVertical: 4,
    minWidth: 40,
  },
  rowMenuIcon: {
    fontSize: 22,
    fontWeight: "700",
    color: "#8E8E93",
    lineHeight: 24,
  },
  rowTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  customBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#E8E8ED",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D1D6",
  },
  customBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#636366",
    letterSpacing: 0.3,
  },
  rowThumbnailContainer: {
    width: 120,
    height: 68,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rowThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  rowTitleText: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  rowTitleHit: { fontSize: 15, fontWeight: "800", color: "#1C1C1E" },
  rowMeta: { fontSize: 12, color: "#6E6E73", marginTop: 2 },
  emptyStateFooter: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyStateGymHint: {
    fontSize: 12,
    color: "#8E8E93",
  },
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
  modalMediaContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  modalMediaFill: {
    width: "100%",
    height: "100%",
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
  editExerciseButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: SYSTEM_ACCENT,
    backgroundColor: "#FFFFFF",
  },
  editExerciseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
  },
  editExerciseButtonDisabled: {
    opacity: 0.45,
  },
  modalBundledHint: {
    fontSize: 13,
    color: "#6E6E73",
    lineHeight: 18,
    marginBottom: 4,
  },
  addButton: {
    backgroundColor: SYSTEM_ACCENT,
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
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
  },
  filterDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
