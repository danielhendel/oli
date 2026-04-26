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
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutsNavBar } from "@/lib/ui/headers/WorkoutsNavBar";
import { headerChromeCircleShell, headerChromeShadow } from "@/lib/ui/headerChrome";
import { UI_HEADER_CHROME_BG, UI_HEADER_CHROME_BORDER } from "@/lib/ui/theme/uiTokens";
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
import { hasBundledExerciseAsset } from "@/lib/workouts/exercises/media/registry";
import { ExerciseMediaPreview } from "@/components/workouts/ExerciseMediaPreview";
import { ExercisePickerRowMedia } from "@/components/workouts/ExercisePickerRowMedia";
import {
  createCustomExerciseSeededFromBundled,
  updateCustomExercise,
  type CustomExerciseRecord,
} from "@/lib/workouts/exercises/customExerciseStore";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import { createExerciseDefinition } from "@/lib/api/exerciseDefinitions";
import { migrateLocalCustomExercisesToBackend } from "@/lib/workouts/exercises/migrateCustomExercisesToBackend";
import { normalizeStrengthLoggingType } from "@/lib/workouts/exercises/loggingType";
import { pickExerciseMediaFromLibrary } from "@/lib/workouts/exercises/pickExerciseMedia";
import { uploadExerciseDefinitionSlotMediaFromPick } from "@/lib/workouts/exercises/uploadExerciseDefinitionSlotMediaFromPick";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  WORKOUT_LOGGER_COLORS,
  WORKOUT_LOGGER_LAYOUT,
  workoutLoggerCancelOutline,
  workoutLoggerCancelOutlineText,
  workoutLoggerTypography,
} from "@/lib/workouts/ui/workoutLoggerTheme";

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

type RowEntry = { exerciseId: string };

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

/** Remote thumbnail for custom rows (bundled assets use registry thumbnails when present). */
function customExerciseThumbnailUri(record: CustomExerciseRecord): string | null {
  const img = typeof record.imageUrl === "string" ? record.imageUrl.trim() : "";
  if (img.length > 0) return img;
  const media = typeof record.mediaUrl === "string" ? record.mediaUrl.trim() : "";
  if (media.length > 0) return media;
  const vid = typeof record.videoUrl === "string" ? record.videoUrl.trim() : "";
  if (vid.length > 0) return vid;
  return null;
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
  const [pickerImageUploadingId, setPickerImageUploadingId] = useState<string | null>(null);

  const isSignedIn = Boolean(user) && !initializing;

  const reloadMergedCustom = useCallback(async () => {
    if (!user) return;
    const rows = await listMergedCustomExerciseRecords(user.uid, () => getIdToken(false)).catch(() => []);
    setCustomExercises(
      rows
        .filter((row) => isSupportedLoggingTypeForPicker(row.loggingType))
        .map((row) => ({ ...row, loggingType: normalizeStrengthLoggingType(row.loggingType) })),
    );
  }, [user, getIdToken]);

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

  const onPickerAddExerciseImage = useCallback(
    async (exerciseId: string) => {
      if (user == null || sessionId == null) return;
      if (!isUserScopedCustomExerciseId(user.uid, exerciseId)) return;
      try {
        const picked = await pickExerciseMediaFromLibrary("image");
        if (picked == null) return;
        setPickerImageUploadingId(exerciseId);
        const url = await uploadExerciseDefinitionSlotMediaFromPick(exerciseId, "image", picked, getIdToken);
        await updateCustomExercise(user.uid, exerciseId, { imageUrl: url });
        await reloadMergedCustom();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        Alert.alert("Could not add image", message);
      } finally {
        setPickerImageUploadingId(null);
      }
    },
    [user, sessionId, getIdToken, reloadMergedCustom],
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

  const rowEntries = useMemo((): RowEntry[] => {
    const hasQuery = query.trim() !== "";
    const entries: RowEntry[] = [];

    if (hasQuery) {
      for (const e of displaySearchResults) {
        entries.push({ exerciseId: e.exerciseId });
      }
    } else if (activeTab === "all") {
      for (const e of allDisplaySorted) {
        entries.push({ exerciseId: e.exerciseId });
      }
    } else if (activeTab === "recent") {
      for (const id of recentIdsForPicker) {
        entries.push({ exerciseId: id });
      }
    } else if (effectiveGymId != null) {
      for (const e of myGymFilteredAll) {
        entries.push({ exerciseId: e.exerciseId });
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

  const listRowCount = rowEntries.length;
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

  const renderListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.tabRow}>
          {(["all", "recent", "myGym"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.chip, activeTab === tab && styles.chipSelected]}
              accessibilityRole="button"
              testID={`exercise-picker-tab-${tab}`}
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
    [activeTab, showMicroline, microlineText, effectiveGymId],
  );

  const pickerHeaderCenter = useMemo(
    () => (
      <View style={styles.navSearchShell} pointerEvents="box-none">
        <Ionicons name="search" size={22} color={WORKOUT_LOGGER_COLORS.textSecondaryMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises"
          placeholderTextColor={WORKOUT_LOGGER_COLORS.textSecondary}
          style={styles.navSearchInput}
          accessibilityLabel="Exercise search"
          testID="exercise-picker-search-input"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery("")}
            style={styles.navClearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={8}
          >
            <Text style={styles.navClearBtnText}>Clear</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setIsFilterOpen(true)}
          style={styles.navFilterIconBtn}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          testID="exercise-picker-filter-button"
          hitSlop={4}
        >
          <Ionicons name="options-outline" size={22} color="#3C3C43" />
          {activeFilterCountNum > 0 ? (
            <View style={styles.filterBadgeMini} accessibilityElementsHidden>
              <Text style={styles.filterBadgeText}>{String(activeFilterCountNum)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    ),
    [query, activeFilterCountNum],
  );

  const renderItem: ListRenderItem<RowEntry> = useCallback(
    ({ item: entry }) => {
      const exerciseId = entry.exerciseId;
      const custom = customById.get(exerciseId) ?? null;
      const name = getRowName(exerciseId);
      const meta = custom ? customMetaFromRecord(custom) : getExerciseMeta(exerciseId);
      const subtitle = custom ? customSubtitle(custom) : `${meta.equipment} · ${meta.primary}`;
      const customThumbUri = custom != null ? customExerciseThumbnailUri(custom) : null;
      const hasBundledThumb = custom == null && hasBundledExerciseAsset(exerciseId);

      const showHighlight = query.trim() !== "";
      const titleNode = showHighlight
        ? renderHighlightedText(name, tokensForHighlight(query), styles)
        : <Text style={styles.rowTitle}>{name}</Text>;

      const isOwnedCustom =
        user != null && custom != null && isUserScopedCustomExerciseId(user.uid, exerciseId);
      const canQuickAdd = sessionId != null;

      return (
        <View style={styles.row} testID={`exercise-picker-row-${exerciseId}`}>
          <ExercisePickerRowMedia
            exerciseId={exerciseId}
            name={name}
            customThumbUri={customThumbUri}
            hasBundledThumb={hasBundledThumb}
            isOwnedCustom={isOwnedCustom}
            sessionId={sessionId}
            uploading={pickerImageUploadingId === exerciseId}
            thumbnailStyle={styles.rowThumbnailSlot}
            onAddImage={onPickerAddExerciseImage}
          />
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
      rowEntries.length,
      query,
      sessionId,
      user,
      onAddToWorkout,
      onOpenEditExercise,
      customById,
      pickerImageUploadingId,
      onPickerAddExerciseImage,
    ],
  );

  const keyExtractor = useCallback((item: RowEntry, index: number): string => {
    return `row-${item.exerciseId}-${index}`;
  }, []);

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.screen}>
          <EmptyState title="Sign in to add exercises" description="Sign in to use the exercise picker." />
        </View>
      </SafeAreaView>
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <WorkoutsNavBar
          hideTitle
          surface="flush"
          contentPaddingHorizontal={16}
          rowMinHeight={56}
          leftColumnWidth={56}
          backButtonSize="large"
          centerSlotLayout="fill"
          onBackPress={() => router.back()}
          centerSlot={pickerHeaderCenter}
          rightSlot={
            <Pressable
              onPress={onOpenCreateExercise}
              style={styles.navCreateIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Create exercise"
              testID="exercise-picker-header-create"
            >
              <Ionicons name="add-circle-outline" size={26} color="#1C1C1E" />
            </Pressable>
          }
          rightSlotWidth={56}
        />
        <FlatList
          style={styles.listFlex}
          data={rowEntries}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
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
      </View>

      <Modal
        visible={isFilterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <Pressable style={styles.filterBackdrop} onPress={() => setIsFilterOpen(false)}>
          <Pressable style={styles.filterPanel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.filterPanelTitle}>Filters</Text>
            <View style={[styles.filterSection, styles.filterSectionFirst]}>
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
            </View>
            <View style={styles.filterSection}>
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
            </View>
            <View style={styles.filterSection}>
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
            </View>
            <View style={styles.filterSection}>
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
            </View>
            <View style={styles.filterPanelActions}>
              <Pressable
                onPress={() => setFilters(DEFAULT_FILTERS)}
                style={[workoutLoggerCancelOutline, styles.filterClearButton]}
                accessibilityRole="button"
                accessibilityLabel="Clear filters"
              >
                <Text style={workoutLoggerCancelOutlineText}>Clear</Text>
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
          <SafeAreaView style={styles.previewSheet} edges={[]} testID="exercise-picker-preview-sheet">
            <Pressable style={styles.previewScreen} onPress={(e) => e.stopPropagation()} testID="exercise-picker-preview-screen">
              <View style={styles.previewGrabber} testID="exercise-picker-preview-grabber" />
              <View style={styles.previewHeader} testID="exercise-picker-preview-header">
                <Pressable
                  onPress={() => setSelectedExerciseId(null)}
                  style={styles.previewCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="chevron-back" size={22} color={WORKOUT_LOGGER_COLORS.textPrimary} />
                </Pressable>
              </View>
              {selectedExerciseId && selectedMeta ? (
                <ScrollView contentContainerStyle={styles.previewContent} keyboardShouldPersistTaps="handled">
                  <View style={styles.previewTitleRow}>
                    <Text style={styles.modalTitle}>{selectedName}</Text>
                    {selectedCustom != null ? (
                      <View style={styles.customBadge} accessibilityLabel="Custom exercise">
                        <Text style={styles.customBadgeText}>Custom</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.modalMeta}>
                    {selectedMeta.equipment} · {selectedMeta.primary}
                  </Text>
                  <View style={styles.previewMediaContainer} testID="exercise-picker-preview-media">
                    <ExerciseMediaPreview
                      exerciseId={selectedExerciseId}
                      customRecord={selectedCustom}
                      style={styles.modalMediaFill}
                      containerBackgroundColor="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.modalDescription} testID="exercise-picker-preview-description">
                    {selectedMeta.description}
                  </Text>
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
                  </View>
                </ScrollView>
              ) : null}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
  },
  screen: {
    flex: 1,
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
  },
  listFlex: { flex: 1 },
  navSearchShell: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: UI_HEADER_CHROME_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_HEADER_CHROME_BORDER,
    ...headerChromeShadow,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
  },
  navSearchInput: {
    flex: 1,
    minWidth: 0,
    flexGrow: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    color: WORKOUT_LOGGER_COLORS.textPrimary,
  },
  navClearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  navClearBtnText: {
    fontSize: 14,
    color: SYSTEM_ACCENT,
    fontWeight: "600",
  },
  navFilterIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadgeMini: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: SYSTEM_ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  navCreateIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...headerChromeCircleShell,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 24,
    flexGrow: 1,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gymStatus: {
    ...workoutLoggerTypography.optionDescription,
    marginTop: 2,
  },
  gymExplanation: {
    ...workoutLoggerTypography.optionDescription,
    marginTop: 2,
  },
  microline: {
    ...workoutLoggerTypography.sheetBody,
    fontSize: 13,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.1)",
  },
  chipSelected: {
    backgroundColor: SYSTEM_ACCENT,
    borderColor: SYSTEM_ACCENT,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60, 60, 67, 0.12)",
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
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  customBadgeText: {
    ...workoutLoggerTypography.sectionChip,
    color: WORKOUT_LOGGER_COLORS.textSecondary,
  },
  rowThumbnailSlot: {
    marginRight: 14,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    ...workoutLoggerTypography.optionTitle,
  },
  rowTitleText: {
    ...workoutLoggerTypography.optionTitle,
  },
  rowTitleHit: {
    ...workoutLoggerTypography.optionTitle,
    fontWeight: "800",
  },
  rowMeta: {
    ...workoutLoggerTypography.optionDescription,
    marginTop: 4,
  },
  emptyStateFooter: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyStateGymHint: {
    fontSize: 12,
    color: "#8E8E93",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.34)",
    justifyContent: "flex-end",
  },
  previewSheet: {
    maxHeight: "90%",
    minHeight: "88%",
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  previewScreen: {
    flex: 1,
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
  },
  previewGrabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: WORKOUT_LOGGER_COLORS.grabber,
    marginTop: 8,
    marginBottom: 8,
  },
  previewHeader: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  previewCloseBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    ...headerChromeCircleShell,
  },
  previewContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  previewMediaContainer: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  modalTitle: {
    ...workoutLoggerTypography.sheetTitle,
    marginBottom: 10,
  },
  modalMeta: {
    ...workoutLoggerTypography.optionDescription,
    marginBottom: 16,
  },
  modalMediaFill: {
    width: "100%",
    height: "100%",
  },
  modalDescription: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginBottom: 16,
  },
  cuesBlock: {
    marginBottom: 20,
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
    gap: 12,
    marginTop: 4,
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
  filterBackdrop: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  filterPanel: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: WORKOUT_LOGGER_COLORS.sheetSurface,
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 28,
  },
  filterPanelTitle: {
    ...workoutLoggerTypography.sheetTitle,
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionFirst: {
    marginTop: 0,
  },
  filterSectionLabel: {
    ...workoutLoggerTypography.sectionEyebrow,
    marginBottom: 10,
  },
  filterChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.1)",
  },
  filterChipText: {
    fontSize: 15,
    fontWeight: "500",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  filterPanelActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WORKOUT_LOGGER_COLORS.grabber,
  },
  filterClearButton: {
    flex: 1,
    marginTop: 0,
  },
  filterDoneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: WORKOUT_LOGGER_LAYOUT.cancelOutlineRadius,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  filterDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
