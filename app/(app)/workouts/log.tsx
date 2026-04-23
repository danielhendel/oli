import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  LayoutAnimation,
  UIManager,
  Platform,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  PanResponder,
  findNodeHandle,
  Alert,
  type PressableAndroidRippleConfig,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WheelPicker } from "@/components/workouts/WheelPicker";
import { WorkoutsNavBar } from "@/lib/ui/headers/WorkoutsNavBar";

if (
  typeof Platform !== "undefined" &&
  Platform.OS === "android" &&
  UIManager?.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const START_GYM_ROW_RIPPLE: PressableAndroidRippleConfig = {
  color: "rgba(0,0,0,0.06)",
  foreground: true,
  borderless: false,
};
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import { getGymLabel, getGymMenuOptions } from "@/lib/workouts/gymRegistry";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";
import { resolveSessionStartedAtIsoForDay } from "@/lib/workouts/journal/sessionAnchorForDay";
import {
  addExercise,
  abandonSession,
  completeSession,
  createBlock,
  createSessionDraft,
  correctStrengthSet,
  logStrengthSet,
  removeBlock,
  removeExercise,
  removeStrengthSet,
  startSession,
  updateBlock,
} from "@/lib/workouts/sessionEngine/commands";
import { isResumableWorkoutSession, loadReducedSession } from "@/lib/workouts/sessionEngine/selectors";
import { persistCompletedSessionToHistory } from "@/lib/workouts/sessionEngine/finalize";
import { getRawEvent } from "@/lib/api/usersMe";
import { devVerifyManualStrengthWorkoutPersisted } from "@/lib/debug/manualStrengthDurability";
import {
  clearActiveWorkoutSessionId,
  getActiveWorkoutLogFlowMode,
  getActiveWorkoutSessionId,
  setActiveWorkoutSessionId,
} from "@/lib/workouts/sessionEngine/activeSessionStorage";
import {
  clearEnrichSessionPointer,
  getEnrichSessionPointer,
  setEnrichSessionPointer,
} from "@/lib/workouts/sessionEngine/enrichSessionStorage";
import type { WorkoutLogFlowMode } from "@/lib/workouts/sessionEngine/workoutLogFlowMode";
import { EXERCISE_LIBRARY_V1 } from "@/lib/workouts/exercises/library.v1";
import { getExerciseMeta } from "@/lib/workouts/exercises/metadata";
import { useRestTimer } from "@/lib/workouts/restTimer";
import { ExerciseMediaPreview } from "@/components/workouts/ExerciseMediaPreview";
import { ThumbnailPlaceholderView } from "@/components/workouts/ThumbnailPlaceholderView";
import { getBundledExerciseAsset, hasBundledExerciseAsset } from "@/lib/workouts/exercises/media/registry";
import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";
import {
  listCustomExercises,
  type CustomExerciseRecord,
} from "@/lib/workouts/exercises/customExerciseStore";
import {
  resolveStrengthLoggingType,
  supportsLoadEntry,
  type StrengthLoggingType,
} from "@/lib/workouts/exercises/loggingType";
import { exitLiveWorkoutLogToOverview } from "@/lib/workouts/navigation/exitWorkoutLogFlow";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_OVERLAY_08 } from "@/lib/ui/theme/systemAccent";

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;
const MAX_WEIGHT_LB = 2000;

/** Precomputed list of weights in lb (0 to max in 2.5 lb steps) for single-wheel picker. Exported for tests. */
export function getPrecomputedWeightListLb(): number[] {
  const list: number[] = [];
  for (let w = 0; w <= MAX_WEIGHT_LB; w += 2.5) {
    list.push(w);
  }
  return list;
}

const PRECOMPUTED_WEIGHTS_LB = getPrecomputedWeightListLb();

/** Reps 1–100 for wheel picker. */
const REP_OPTIONS = Array.from({ length: 100 }, (_, i) => i + 1);
/** "bw" plus 0–max lb in 2.5 lb steps for wheel picker. */
const LOAD_OPTIONS: (string | number)[] = ["bw", ...PRECOMPUTED_WEIGHTS_LB];
/** Empty plus RPE 1–10 for wheel picker. */
const RPE_OPTIONS: (number | "")[] = ["", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Return the index in PRECOMPUTED_WEIGHTS_LB of the weight closest to lb (for resolved display/selection). Exported for tests. */
export function closestWeightIndexLb(lb: number): number {
  let best = 0;
  let bestDist = Math.abs(PRECOMPUTED_WEIGHTS_LB[0]! - lb);
  for (let i = 1; i < PRECOMPUTED_WEIGHTS_LB.length; i++) {
    const d = Math.abs(PRECOMPUTED_WEIGHTS_LB[i]! - lb);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Nearest weight option in lb from precomputed list (for quick-jump). */
function nearestWeightOptionLb(lb: number): number {
  return PRECOMPUTED_WEIGHTS_LB[closestWeightIndexLb(lb)]!;
}

/** Format draft loadText for display in active row (e.g. "185 lb", "17.5 lb"). */
function formatActiveWeightDisplay(loadText: string): string {
  const t = loadText.trim();
  if (!t) return "";
  const n = parseFloat(t);
  if (Number.isNaN(n)) return t;
  const s = Number.isInteger(n) ? String(n) : t;
  return `${s} lb`;
}

function getLoggedSetVolumeLb(set: { reps: number; loadKg: number | null }): number {
  if (set.loadKg == null || set.loadKg <= 0) return 0;
  return Math.max(0, Math.round(set.reps * set.loadKg * LB_PER_KG));
}

function formatLoggedSetWeightLabel(loadKg: number | null): string {
  if (loadKg == null || loadKg <= 0) return "BW";
  const lb = loadKg * LB_PER_KG;
  const roundedInt = Math.round(lb);
  if (Math.abs(lb - roundedInt) < 0.05) return `${roundedInt} lb`;
  return `${lb.toFixed(1)} lb`;
}

function formatBodyweightSetLoadLabel(loadKg: number | null): string {
  if (loadKg == null || loadKg <= 0) return "BW";
  return `BW + ${formatLoggedSetWeightLabel(loadKg)}`;
}

function getLoggedSetBarColor(rpe: number | null): string {
  if (rpe == null || !Number.isFinite(rpe)) return "#8E8E93";
  const value = Math.max(0, Math.min(10, rpe));
  if (value <= 2) return "#8E8E93";
  if (value <= 4) return "#FFD60A";
  if (value <= 6) return "#32D74B";
  if (value <= 8) return "#0A84FF";
  return "#FF3B30";
}

/** UI-only draft set before logging via logStrengthSet. */
type DraftSet = { id: string; repsText: string; loadText: string; rpeText: string };

type BlockTypeId = "warmup" | "sets" | "superset" | "circuit" | "cooldown" | "cardio";

function blockTypeFromId(blockId: string): BlockTypeId | null {
  if (blockId.startsWith("block:warmup:")) return "warmup";
  if (blockId.startsWith("block:sets:")) return "sets";
  if (blockId.startsWith("block:superset:")) return "superset";
  if (blockId.startsWith("block:circuit:")) return "circuit";
  if (blockId.startsWith("block:cooldown:")) return "cooldown";
  if (blockId.startsWith("block:cardio:")) return "cardio";
  return null;
}

function nextBlockId(
  type: BlockTypeId,
  existingBlockIds: string[],
): string {
  const prefix = `block:${type}:`;
  const existing = existingBlockIds.filter((id) => id.startsWith(prefix));
  if (type === "superset") {
    const used = new Set(existing.map((id) => id.slice(prefix.length).toUpperCase()));
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) return `${prefix}${letter}`;
    }
    return `${prefix}A`;
  }
  const nums = existing
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${prefix}${max + 1}`;
}

function blockHeaderLabel(type: BlockTypeId | null): string {
  if (type === "warmup") return "Warm up";
  if (type === "sets") return "Sets";
  if (type === "superset") return "Superset";
  if (type === "circuit") return "Circuit";
  if (type === "cooldown") return "Cool down";
  if (type === "cardio") return "Cardio";
  return "Block";
}

const SWIPE_REVEAL_WIDTH = 72;

function SwipeableSetRow({
  setId,
  onDelete,
  rowContent,
}: {
  setId: string;
  onDelete: () => void;
  rowContent: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
        onPanResponderGrant: () => {
          /* no-op; gesture position tracked in onPanResponderMove */
        },
        onPanResponderMove: (_, g) => {
          const maxDrag = SWIPE_REVEAL_WIDTH;
          const x = Math.min(0, Math.max(-maxDrag, g.dx));
          translateX.setValue(x);
        },
        onPanResponderRelease: (_, g) => {
          const threshold = SWIPE_REVEAL_WIDTH / 2;
          const toValue = g.dx < -threshold ? -SWIPE_REVEAL_WIDTH : 0;
          Animated.spring(translateX, {
            toValue,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
          }).start();
        },
      }),
    [translateX],
  );

  return (
    <View style={styles.swipeableRowWrap}>
      <View style={styles.swipeableRowDeleteBg}>
        <Pressable
          onPress={onDelete}
          style={styles.swipeableRowDeleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`Delete set ${setId}`}
        >
          <Text style={styles.swipeableRowDeleteText}>Delete</Text>
        </Pressable>
      </View>
      <Animated.View
        style={[styles.setRowCompleted, { transform: [{ translateX }] }]}
        {...pan.panHandlers}
      >
        {rowContent}
      </Animated.View>
    </View>
  );
}

function ExerciseListRow({
  ex,
  displayName,
  onToggleExpand,
  onDelete,
}: {
  ex: ReducedSessionV1["exercises"][number];
  displayName: string;
  onToggleExpand: (slotId: string) => void;
  onDelete: (slotId: string) => void;
}) {
  const setCount = ex.sets.length;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => onToggleExpand(ex.slotId)}
        style={styles.exerciseListRow}
        accessibilityRole="button"
        accessibilityLabel={`Open exercise ${displayName}`}
      >
        {hasBundledExerciseAsset(ex.exerciseId) ? (
          <View style={styles.exerciseListRowThumbnailContainer}>
            <Image
              source={getBundledExerciseAsset(ex.exerciseId)}
              style={styles.exerciseListRowThumbnailImage}
              resizeMode="contain"
              accessibilityLabel={`${displayName} thumbnail`}
            />
          </View>
        ) : (
          <ThumbnailPlaceholderView width={120} height={68} />
        )}
        <View style={styles.exerciseListRowCenter}>
          <Text style={styles.exerciseListRowName}>{displayName}</Text>
          <Text style={styles.exerciseListRowSets}>
            {setCount === 0 ? "0 sets" : `${setCount} set${setCount === 1 ? "" : "s"}`}
          </Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          style={styles.exerciseListRowMore}
          accessibilityRole="button"
          accessibilityLabel={`Delete exercise ${displayName}`}
        >
          <Text style={styles.moreDots}>•••</Text>
        </Pressable>
      </Pressable>
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.confirmModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmModalTitle}>Delete exercise?</Text>
            <Text style={styles.muted}>Remove "{displayName}" from this workout.</Text>
            <View style={styles.confirmModalActions}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={styles.secondaryBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel delete"
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowDeleteConfirm(false);
                  onDelete(ex.slotId);
                }}
                style={styles.cancelConfirmBtn}
                accessibilityRole="button"
                accessibilityLabel={`Confirm delete exercise ${displayName}`}
              >
                <Text style={styles.primaryBtnText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export type WorkoutLogSessionEntry = "live" | "enrichment";

export function WorkoutLogScreenInner({ sessionEntry }: { sessionEntry: WorkoutLogSessionEntry }) {
  const isEnrichmentEntry = sessionEntry === "enrichment";
  const { user, initializing, getIdToken } = useAuth();

  type UiState =
    | { status: "idle" }
    | { status: "starting" }
    | { status: "active"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "completed"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "error"; message: string; canRetryFinishPersist?: boolean };

  const router = useRouter();
  const params = useLocalSearchParams<{
    pickedExerciseId?: string;
    blockId?: string;
    enrichDay?: string;
    sessionAnchorIso?: string;
    /** `ReconciledWorkoutSession.id` from strength day detail — ties backfill log to one workout. */
    enrichTargetId?: string;
    /** Local journal `sessionId` to hydrate when editing an existing completed/manual workout. */
    journalSessionId?: string;
  }>();
  const pickedExerciseIdParam = typeof params.pickedExerciseId === "string" ? params.pickedExerciseId : undefined;
  const blockIdParam = typeof params.blockId === "string" ? params.blockId : undefined;
  const appliedPickRef = useRef<string | null>(null);
  const enrichReturnDayRef = useRef<string | null>(null);
  const enrichSessionAnchorRef = useRef<string | null>(null);
  const enrichTargetIdRef = useRef<string | null>(null);
  const finishPersistRetryRef = useRef<{
    sessionId: string;
    returnDay: string | null;
    enrichTid: string | null;
  } | null>(null);
  /** Prevents duplicate Alert loops while the same active session blocks resume. */
  const collisionPromptSidRef = useRef<string | null>(null);
  const [resumeGeneration, setResumeGeneration] = useState(0);
  const [activeLogFlowMode, setActiveLogFlowMode] = useState<WorkoutLogFlowMode>("live");

  const [ui, setUi] = useState<UiState>(() =>
    sessionEntry === "enrichment" ? { status: "starting" } : { status: "idle" },
  );
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [addBlockModalVisible, setAddBlockModalVisible] = useState(false);
  const [blockOptions, setBlockOptions] = useState<{
    blockId: string;
    title: string;
    blockType: string;
  } | null>(null);
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<{ blockId: string; title: string } | null>(null);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const { panelVisible: restTimerPanelVisible, setPanelVisible: setRestTimerPanelVisible } = useRestTimer();
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [exerciseMenuSlotId, setExerciseMenuSlotId] = useState<string | null>(null);
  const [draftSetsBySlotId, setDraftSetsBySlotId] = useState<Record<string, DraftSet[]>>({});
  const [bodyweightLoadEnabledBySlotId, setBodyweightLoadEnabledBySlotId] = useState<Record<string, boolean>>({});
  const [editSetDraft, setEditSetDraft] = useState<{
    setId: string;
    slotId: string;
    repsText: string;
    loadText: string;
    intensityText: string;
  } | null>(null);
  const [draftFieldPicker, setDraftFieldPicker] = useState<{
    slotId: string;
    draftId: string;
    field: "reps" | "load" | "rpe";
  } | null>(null);
  const [completedSetPicker, setCompletedSetPicker] = useState<{
    slotId: string;
    setId: string;
    field: "reps" | "load" | "rpe";
  } | null>(null);
  const [customExercisesById, setCustomExercisesById] = useState<Record<string, CustomExerciseRecord>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [gymPickerVisible, setGymPickerVisible] = useState(false);
  const [gymSaveError, setGymSaveError] = useState<string | null>(null);
  /** Workout-flow gym for Start screen: sticks even when preference save fails. */
  const [startScreenGymId, setStartScreenGymId] = useState<string | null>(null);
  /** Gym for the current session; set when user presses Start workout. Passed to exercise picker. */
  const [sessionGymId, setSessionGymId] = useState<string | null>(null);

  const { state: prefState, setSelectedGymId } = usePreferences();
  const selectedGymIdFromPref = prefState.preferences?.selectedGymId ?? null;
  const startScreenGymIdSyncedRef = useRef(false);
  useEffect(() => {
    if (ui.status !== "idle") {
      startScreenGymIdSyncedRef.current = false;
      return;
    }
    if (prefState.status !== "ready" || startScreenGymIdSyncedRef.current) return;
    startScreenGymIdSyncedRef.current = true;
    setStartScreenGymId(selectedGymIdFromPref);
  }, [ui.status, prefState.status, selectedGymIdFromPref]);

  const scrollViewRef = useRef<ScrollView>(null);
  const expandedCardRef = useRef<View>(null);
  const scrollContentOffsetY = useRef(0);

  const isSignedIn = Boolean(user) && !initializing;

  const sessionState =
    ui.status === "active" || ui.status === "completed"
      ? { reduced: ui.reduced, sessionId: ui.sessionId }
      : null;
  const reduced = sessionState?.reduced ?? null;
  const sessionId = sessionState?.sessionId ?? null;

  /** Current value for the open Reps/Weight/RPE picker (draft or completed set); used as native Picker selectedValue. */
  const currentPickerValue = useMemo(() => {
    const open = draftFieldPicker ?? completedSetPicker;
    if (!open) return null;
    const field = open.field;
    let currentReps: number | null = null;
    let currentLoadLb: number | null = null;
    let currentRpe: number | null = null;
    if (draftFieldPicker) {
      const draft = draftSetsBySlotId[draftFieldPicker.slotId]?.find((d) => d.id === draftFieldPicker.draftId);
      if (draft) {
        const r = parseInt(draft.repsText.trim(), 10);
        currentReps = Number.isNaN(r) || r < 1 || r > 100 ? null : r;
        const loadTrim = draft.loadText.trim();
        currentLoadLb = loadTrim === "" ? null : parseFloat(loadTrim);
        if (currentLoadLb !== null && Number.isNaN(currentLoadLb)) currentLoadLb = null;
        const rpeNum = parseInt(draft.rpeText.trim(), 10);
        currentRpe = Number.isNaN(rpeNum) || rpeNum < 1 || rpeNum > 10 ? null : rpeNum;
      }
    } else if (completedSetPicker && reduced?.exercises) {
      const ex = reduced.exercises.find((e) => e.slotId === completedSetPicker.slotId);
      const set = ex?.sets?.find((s) => s.setId === completedSetPicker.setId);
      if (set) {
        currentReps = set.reps >= 1 && set.reps <= 100 ? set.reps : null;
        currentLoadLb = set.loadKg != null ? set.loadKg * LB_PER_KG : null;
        currentRpe = set.rpe != null && set.rpe >= 1 && set.rpe <= 10 ? set.rpe : null;
      }
    }
    /** For load: resolved list value in lb (BW = null/0); matches PRECOMPUTED_WEIGHTS_LB option. */
    let resolvedWeightLb: number | null = null;
    if (field === "load" && currentLoadLb != null && currentLoadLb > 0) {
      const i = closestWeightIndexLb(currentLoadLb);
      resolvedWeightLb = PRECOMPUTED_WEIGHTS_LB[i] ?? null;
    }
    return {
      field,
      currentReps,
      currentLoadLb,
      resolvedWeightLb,
      currentRpe,
    };
  }, [draftFieldPicker, completedSetPicker, draftSetsBySlotId, reduced]);

  const canInteract = isSignedIn && ui.status !== "starting";

  const enrichDayLabel = useMemo(() => {
    const d = typeof params.enrichDay === "string" ? params.enrichDay : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const dt = new Date(`${d}T12:00:00.000Z`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }, [params.enrichDay]);

  const isHydratingExistingJournal = useMemo(() => {
    const j = typeof params.journalSessionId === "string" ? params.journalSessionId.trim() : "";
    return j.length > 0;
  }, [params.journalSessionId]);

  const enrichNavTitle = useMemo(() => {
    const dayPart = enrichDayLabel != null ? ` · ${enrichDayLabel}` : "";
    return isHydratingExistingJournal ? `Edit exercises${dayPart}` : `Add exercises${dayPart}`;
  }, [enrichDayLabel, isHydratingExistingJournal]);

  useEffect(() => {
    if (!isEnrichmentEntry) {
      enrichReturnDayRef.current = null;
      enrichSessionAnchorRef.current = null;
      enrichTargetIdRef.current = null;
      return;
    }
    const dayRaw = params.enrichDay;
    const enrichDay =
      typeof dayRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : null;
    const anchorRaw = params.sessionAnchorIso;
    const anchor =
      typeof anchorRaw === "string" && anchorRaw.trim().length > 0 ? anchorRaw.trim() : null;
    const tidRaw = params.enrichTargetId;
    const tid =
      typeof tidRaw === "string" && tidRaw.trim().length > 0 ? tidRaw.trim() : null;
    enrichReturnDayRef.current = enrichDay;
    enrichSessionAnchorRef.current = enrichDay != null ? anchor : null;
    enrichTargetIdRef.current = enrichDay != null ? tid : null;
  }, [isEnrichmentEntry, params.enrichDay, params.sessionAnchorIso, params.enrichTargetId]);

  const idleLogFlowMode: WorkoutLogFlowMode = isEnrichmentEntry ? "backfill" : "live";

  const logFlowMode: WorkoutLogFlowMode =
    ui.status === "active" || ui.status === "completed" ? activeLogFlowMode : idleLogFlowMode;

  const refreshReduced = useCallback(async (uid: string, sid: string) => {
    const next = await loadReducedSession(uid, sid);
    setUi((prev) => {
      if (prev.status === "active" && prev.sessionId === sid) return { ...prev, reduced: next };
      if (prev.status === "completed" && prev.sessionId === sid) return { ...prev, reduced: next };
      return prev;
    });
  }, []);

  /**
   * Legacy cleanup: previous builds persisted enrichment sessions in global active pointer.
   * Once that session is completed/discarded, clear the global backfill pointer so Start Workout
   * no longer shows stale "Exercise log open".
   */
  const clearLegacyBackfillPointerForSession = useCallback(
    async (uid: string, finishedSessionId: string): Promise<void> => {
      const activeSid = await getActiveWorkoutSessionId(uid);
      if (activeSid !== finishedSessionId) return;
      const flow = await getActiveWorkoutLogFlowMode(uid);
      if (flow !== "backfill") return;
      await clearActiveWorkoutSessionId(uid);
    },
    [],
  );

  /**
   * Enrichment route: open or resume the journal session scoped to this workout target only
   * (enrichSessionStorage). Never consults the global live active pointer.
   */
  useEffect(() => {
    let cancelled = false;
    if (!isEnrichmentEntry) return;
    if (!user || initializing) return;
    if (ui.status !== "starting") return;
    (async () => {
      const dayRaw = params.enrichDay;
      const enrichDay =
        typeof dayRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) ? dayRaw : null;
      const tidRaw = params.enrichTargetId;
      const tid =
        typeof tidRaw === "string" && tidRaw.trim().length > 0 ? tidRaw.trim() : null;
      const anchorRaw = params.sessionAnchorIso;
      const anchor =
        typeof anchorRaw === "string" && anchorRaw.trim().length > 0 ? anchorRaw.trim() : null;

      if (enrichDay == null || tid == null) {
        if (!cancelled) {
          setUi({
            status: "error",
            message: "Missing workout context. Open from the workout day again.",
          });
        }
        return;
      }

      const hydrateRaw = params.journalSessionId;
      const hydrateSid =
        typeof hydrateRaw === "string" && hydrateRaw.trim().length > 0 ? hydrateRaw.trim() : null;

      try {
        if (hydrateSid != null) {
          const reducedHydrated = await loadReducedSession(user.uid, hydrateSid);
          if (cancelled) return;
          if (reducedHydrated.eventCount < 1) {
            if (!cancelled) {
              setUi({ status: "error", message: "Workout log not found." });
            }
            return;
          }
          if (reducedHydrated.status === "abandoned") {
            if (!cancelled) {
              setUi({
                status: "error",
                message: "That workout was discarded and can't be edited.",
              });
            }
            return;
          }
          const started = reducedHydrated.startedAt;
          if (started == null) {
            if (!cancelled) {
              setUi({ status: "error", message: "This workout can't be edited yet." });
            }
            return;
          }
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          const sessionDay = ymdInTimeZoneFromIso(started, tz);
          if (sessionDay !== enrichDay) {
            if (!cancelled) {
              setUi({
                status: "error",
                message: "That workout doesn't match this day.",
              });
            }
            return;
          }
          await setEnrichSessionPointer(user.uid, tid, hydrateSid);
          if (cancelled) return;
          setActiveLogFlowMode("backfill");
          setSessionGymId(selectedGymIdFromPref ?? null);
          setUi({ status: "active", sessionId: hydrateSid, reduced: reducedHydrated });
          return;
        }

        let sid = await getEnrichSessionPointer(user.uid, tid);
        if (cancelled) return;

        if (sid) {
          const reducedExisting = await loadReducedSession(user.uid, sid);
          if (cancelled) return;
          if (
            reducedExisting.status === "draft" ||
            reducedExisting.status === "active" ||
            reducedExisting.status === "completed"
          ) {
            setActiveLogFlowMode("backfill");
            setSessionGymId(selectedGymIdFromPref ?? null);
            setUi({ status: "active", sessionId: sid, reduced: reducedExisting });
            return;
          }
          await clearEnrichSessionPointer(user.uid, tid);
          sid = null;
        }

        const anchorForStart = resolveSessionStartedAtIsoForDay(enrichDay, anchor ?? undefined);
        const { sessionId: newId } = await createSessionDraft(user.uid);
        await startSession(user.uid, newId, undefined, { anchorOccurredAt: anchorForStart });
        await setEnrichSessionPointer(user.uid, tid, newId);
        const reduced = await loadReducedSession(user.uid, newId);
        if (cancelled) return;
        setActiveLogFlowMode("backfill");
        setSessionGymId(selectedGymIdFromPref ?? null);
        setUi({ status: "active", sessionId: newId, reduced });
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          setUi({ status: "error", message: msg });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isEnrichmentEntry,
    user,
    initializing,
    ui.status,
    params.enrichDay,
    params.enrichTargetId,
    params.sessionAnchorIso,
    params.journalSessionId,
    selectedGymIdFromPref,
  ]);

  /**
   * Live /log only: resume in-progress workout from the global active pointer.
   * If storage still says backfill (legacy), prompt to discard before starting live.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isEnrichmentEntry) return;
      if (!user || initializing) return;
      if (ui.status !== "idle") return;
      try {
        const sid = await getActiveWorkoutSessionId(user.uid);
        if (!sid || cancelled) return;

        const flow = await getActiveWorkoutLogFlowMode(user.uid);
        if (cancelled) return;

        const tryResume = async (): Promise<void> => {
          try {
            const next = await loadReducedSession(user.uid, sid);
            if (cancelled) return;
            if (!isResumableWorkoutSession(next)) {
              await clearActiveWorkoutSessionId(user.uid);
              if (!cancelled) setResumeGeneration((n) => n + 1);
              return;
            }
            setActiveLogFlowMode(flow);
            collisionPromptSidRef.current = null;
            setUi({ status: "active", sessionId: sid, reduced: next });
          } catch {
            try {
              await clearActiveWorkoutSessionId(user.uid);
            } catch {
              // best effort
            }
            if (!cancelled) setUi({ status: "idle" });
          }
        };

        const discardPointer = async (): Promise<void> => {
          try {
            await abandonSession(user.uid, sid);
          } catch {
            // session may be broken; still clear pointer
          }
          try {
            await clearActiveWorkoutSessionId(user.uid);
          } catch {
            // best effort
          }
          collisionPromptSidRef.current = null;
          if (!cancelled) setResumeGeneration((n) => n + 1);
        };

        const promptDiscard = (title: string, message: string, discardLabel: string): void => {
          if (collisionPromptSidRef.current === sid) return;
          collisionPromptSidRef.current = sid;
          Alert.alert(title, message, [
            {
              text: "Go back",
              style: "cancel",
              onPress: () => {
                collisionPromptSidRef.current = null;
                router.back();
              },
            },
            {
              text: discardLabel,
              style: "destructive",
              onPress: () => {
                void discardPointer();
              },
            },
          ]);
        };

        if (flow === "backfill") {
          try {
            const reducedBackfill = await loadReducedSession(user.uid, sid);
            if (cancelled) return;
            if (reducedBackfill.status === "completed" || reducedBackfill.status === "abandoned") {
              await clearActiveWorkoutSessionId(user.uid);
              if (!cancelled) setResumeGeneration((n) => n + 1);
              return;
            }
          } catch {
            try {
              await clearActiveWorkoutSessionId(user.uid);
            } catch {
              // best effort
            }
            if (!cancelled) setResumeGeneration((n) => n + 1);
            return;
          }
          promptDiscard(
            "Exercise log open",
            "Finish or discard the exercise log you started from a workout day before starting a new workout here.",
            "Discard log",
          );
          return;
        }

        await tryResume();
      } catch {
        try {
          await clearActiveWorkoutSessionId(user.uid);
        } catch {
          // best effort
        }
        if (!cancelled) setUi({ status: "idle" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isEnrichmentEntry,
    user,
    initializing,
    ui.status,
    resumeGeneration,
    router,
  ]);

  const onStart = useCallback(async () => {
    if (isEnrichmentEntry) return;
    if (!user) {
      setUi({ status: "error", message: "Not signed in." });
      return;
    }
    const effectiveGymAtStart = startScreenGymId ?? selectedGymIdFromPref ?? null;
    setUi({ status: "starting" });
    try {
      const { sessionId } = await createSessionDraft(user.uid);
      await startSession(user.uid, sessionId, undefined, undefined);
      await setActiveWorkoutSessionId(user.uid, sessionId, { logFlowMode: "live" });
      const reduced = await loadReducedSession(user.uid, sessionId);
      setActiveLogFlowMode("live");
      setUi({ status: "active", sessionId, reduced });
      setSessionGymId(effectiveGymAtStart);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user, startScreenGymId, selectedGymIdFromPref, isEnrichmentEntry]);

  const onPickExercise = useCallback(
    async (exerciseId: string, blockId?: string) => {
      if (!user || !sessionId) return;
      try {
        const pos = reduced?.exercises ? reduced.exercises.filter((e) => !e.removed).length : 0;
        await addExercise(user.uid, sessionId, {
          exerciseId,
          position: pos,
          ...(blockId != null ? { blockId } : {}),
        });
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, reduced?.exercises, refreshReduced],
  );

  const onRemoveExercise = useCallback(
    async (slotId: string) => {
      if (!user || !sessionId) return;
      try {
        await removeExercise(user.uid, sessionId, slotId);
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, refreshReduced],
  );

  const onRemoveSet = useCallback(
    async (setId: string) => {
      if (!user || !sessionId) return;
      try {
        await removeStrengthSet(user.uid, sessionId, setId);
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, refreshReduced],
  );

  const onSaveEditSet = useCallback(async () => {
    if (!user || !sessionId || !editSetDraft) return;
    const { setId, repsText, loadText, intensityText } = editSetDraft;
    const reps = parsePositiveInt(repsText);
    if (reps == null) {
      setUi({ status: "error", message: "Reps must be a positive integer." });
      return;
    }
    const loadLb = loadText.trim() === "" ? undefined : parsePositiveFloat(loadText);
    if (loadText.trim() !== "" && loadLb == null) {
      setUi({ status: "error", message: "Load must be > 0 when provided." });
      return;
    }
    const loadKg = loadLb != null ? loadLb * KG_PER_LB : undefined;
    const rpeVal = intensityText.trim() === "" ? undefined : parseIntensity(intensityText);
    if (intensityText.trim() !== "" && rpeVal == null) {
      setUi({ status: "error", message: "RPE must be between 0 and 10." });
      return;
    }
    try {
      await correctStrengthSet(user.uid, sessionId, {
        setId,
        patch: {
          reps,
          ...(loadKg !== undefined ? { loadKg } : {}),
          ...(rpeVal != null ? { rpe: rpeVal } : {}),
        },
      });
      setEditSetDraft(null);
      await refreshReduced(user.uid, sessionId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user, sessionId, editSetDraft, refreshReduced]);

  const onCompletedSetFieldSelect = useCallback(
    async (
      setId: string,
      field: "reps" | "load" | "rpe",
      value: { reps?: number; loadKg?: number; rpe?: number },
    ) => {
      if (!user || !sessionId) return;
      const patch: Partial<{ reps: number; loadKg: number; rpe: number }> = {};
      if (field === "reps" && value.reps != null) patch.reps = value.reps;
      if (field === "load" && value.loadKg !== undefined) patch.loadKg = value.loadKg;
      if (field === "rpe" && value.rpe !== undefined) patch.rpe = value.rpe;
      if (Object.keys(patch).length === 0) {
        setCompletedSetPicker(null);
        return;
      }
      try {
        await correctStrengthSet(user.uid, sessionId, { setId, patch });
        setCompletedSetPicker(null);
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, refreshReduced],
  );

  const onLogDraftSet = useCallback(
    async (
      slotId: string,
      draft: DraftSet,
      loggingType: StrengthLoggingType,
      allowLoadEntry: boolean,
    ) => {
      if (!user || !sessionId || !reduced) return;
      const reps = parsePositiveInt(draft.repsText);
      if (reps == null) {
        setUi({ status: "error", message: "Reps are required." });
        return;
      }
      const allowLoad = supportsLoadEntry(loggingType) || allowLoadEntry;
      const loadLb = allowLoad && draft.loadText.trim() !== "" ? parsePositiveFloat(draft.loadText) : undefined;
      if (allowLoad && draft.loadText.trim() !== "" && loadLb == null) {
        setUi({ status: "error", message: "Load must be > 0 when provided." });
        return;
      }
      const loadKg = allowLoad && loadLb != null ? loadLb * KG_PER_LB : undefined;
      const rpeVal = draft.rpeText.trim() === "" ? undefined : parseIntensity(draft.rpeText);
      if (draft.rpeText.trim() !== "" && rpeVal == null) {
        setUi({ status: "error", message: "RPE must be between 0 and 10." });
        return;
      }
      const exercise = reduced.exercises.find((e) => e.slotId === slotId);
      const existingOrdinals = exercise?.sets.map((s) => s.ordinal) ?? [];
      const nextOrdinal = existingOrdinals.length > 0 ? Math.max(...existingOrdinals) + 1 : 1;
      try {
        await logStrengthSet(user.uid, sessionId, {
          slotId,
          ordinal: nextOrdinal,
          reps,
          ...(loadKg != null && { loadKg }),
          ...(rpeVal != null && { rpe: rpeVal }),
        });
        setDraftSetsBySlotId((prev) => {
          const list = prev[slotId] ?? [];
          const nextList = list.filter((d) => d.id !== draft.id);
          const newDraft: DraftSet = {
            id: `${slotId}:draft:${nextList.length}`,
            repsText: String(reps),
            loadText: allowLoad && draft.loadText.trim() !== "" ? draft.loadText.trim() : "",
            rpeText: rpeVal != null ? String(rpeVal) : "",
          };
          return { ...prev, [slotId]: [...nextList, newDraft] };
        });
        if (loggingType === "bodyweight_reps") {
          setBodyweightLoadEnabledBySlotId((prev) => ({
            ...prev,
            [slotId]: loadKg != null && loadKg > 0,
          }));
        }
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, reduced, refreshReduced],
  );

  const onCancelWorkout = useCallback(async () => {
    if (!user || !sessionId) return;
    setCancelModalVisible(false);
    try {
      await abandonSession(user.uid, sessionId);
      if (isEnrichmentEntry) {
        const tid = enrichTargetIdRef.current;
        if (tid) await clearEnrichSessionPointer(user.uid, tid);
        await clearLegacyBackfillPointerForSession(user.uid, sessionId);
        const day = enrichReturnDayRef.current;
        enrichReturnDayRef.current = null;
        enrichSessionAnchorRef.current = null;
        enrichTargetIdRef.current = null;
        if (day != null) {
          router.dismissTo({ pathname: "/(app)/workouts/day/[day]", params: { day } });
        } else {
          router.back();
        }
        setUi({ status: "idle" });
        return;
      }
      await clearLegacyBackfillPointerForSession(user.uid, sessionId);
      try {
        await clearActiveWorkoutSessionId(user.uid);
      } catch {
        // best effort: abandoning the session is the source of truth
      }
      setUi({ status: "idle" });
      exitLiveWorkoutLogToOverview(router);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user, sessionId, isEnrichmentEntry, router, clearLegacyBackfillPointerForSession]);

  const parsePositiveInt = (s: string): number | null => {
    const n = parseInt(s.trim(), 10);
    if (!Number.isFinite(n)) return null;
    if (!Number.isInteger(n)) return null;
    if (n <= 0) return null;
    return n;
  };

  const parsePositiveFloat = (s: string): number | null => {
    const n = parseFloat(s.trim());
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    return n;
  };

  const parseIntensity = (s: string): number | null => {
    const n = parseInt(s.trim(), 10);
    if (!Number.isFinite(n)) return null;
    if (n < 0 || n > 10) return null;
    return n;
  };

  const onFinish = useCallback(async () => {
    if (!user || !sessionId) return;
    const returnDay = enrichReturnDayRef.current;
    const enrichTid = enrichTargetIdRef.current;
    const finalizeAndExit = async (): Promise<void> => {
      if (isEnrichmentEntry) {
        if (enrichTid) await clearEnrichSessionPointer(user.uid, enrichTid);
        await clearLegacyBackfillPointerForSession(user.uid, sessionId);
      } else {
        await clearLegacyBackfillPointerForSession(user.uid, sessionId);
        await clearActiveWorkoutSessionId(user.uid);
      }
      if (returnDay != null) {
        enrichReturnDayRef.current = null;
        enrichSessionAnchorRef.current = null;
        enrichTargetIdRef.current = null;
        router.dismissTo({ pathname: "/(app)/workouts/day/[day]", params: { day: returnDay } });
        setUi({ status: "idle" });
        return;
      }
      if (!isEnrichmentEntry) {
        setUi({ status: "idle" });
        exitLiveWorkoutLogToOverview(router);
        return;
      }
      const next = await loadReducedSession(user.uid, sessionId);
      setUi({ status: "completed", sessionId, reduced: next });
    };
    let completedLocally = false;
    try {
      await completeSession(user.uid, sessionId);
      completedLocally = true;
      const token = await getIdToken(false);
      if (!token) {
        throw new Error("Not signed in.");
      }
      const persistResult = await persistCompletedSessionToHistory(user.uid, sessionId, token);
      if (persistResult.kind === "written" && __DEV__ && !process.env.JEST_WORKER_ID) {
        await devVerifyManualStrengthWorkoutPersisted({
          getRawEvent,
          idToken: token,
          rawEventId: persistResult.rawEventId,
          expectedMinExerciseCount: 1,
        });
      }
      finishPersistRetryRef.current = null;
      await finalizeAndExit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (completedLocally) {
        finishPersistRetryRef.current = { sessionId, returnDay, enrichTid };
        setUi({
          status: "error",
          message: `${msg} Workout is complete locally, but history sync failed.`,
          canRetryFinishPersist: true,
        });
        return;
      }
      setUi({ status: "error", message: msg, canRetryFinishPersist: false });
    }
  }, [user, sessionId, router, isEnrichmentEntry, clearLegacyBackfillPointerForSession, getIdToken]);

  const onRetryFinishPersist = useCallback(async () => {
    if (!user) return;
    const retry = finishPersistRetryRef.current;
    if (!retry) return;
    try {
      const token = await getIdToken(false);
      if (!token) {
        throw new Error("Not signed in.");
      }
      const persistResult = await persistCompletedSessionToHistory(user.uid, retry.sessionId, token);
      if (persistResult.kind === "written" && __DEV__ && !process.env.JEST_WORKER_ID) {
        await devVerifyManualStrengthWorkoutPersisted({
          getRawEvent,
          idToken: token,
          rawEventId: persistResult.rawEventId,
          expectedMinExerciseCount: 1,
        });
      }
      finishPersistRetryRef.current = null;
      if (isEnrichmentEntry) {
        if (retry.enrichTid) await clearEnrichSessionPointer(user.uid, retry.enrichTid);
        await clearLegacyBackfillPointerForSession(user.uid, retry.sessionId);
      } else {
        await clearLegacyBackfillPointerForSession(user.uid, retry.sessionId);
        await clearActiveWorkoutSessionId(user.uid);
      }
      if (retry.returnDay != null) {
        enrichReturnDayRef.current = null;
        enrichSessionAnchorRef.current = null;
        enrichTargetIdRef.current = null;
        router.dismissTo({ pathname: "/(app)/workouts/day/[day]", params: { day: retry.returnDay } });
        setUi({ status: "idle" });
        return;
      }
      if (!isEnrichmentEntry) {
        setUi({ status: "idle" });
        exitLiveWorkoutLogToOverview(router);
        return;
      }
      const next = await loadReducedSession(user.uid, retry.sessionId);
      setUi({ status: "completed", sessionId: retry.sessionId, reduced: next });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({
        status: "error",
        message: `${msg} Workout is complete locally, but history sync failed.`,
        canRetryFinishPersist: true,
      });
    }
  }, [user, getIdToken, isEnrichmentEntry, clearLegacyBackfillPointerForSession, router]);

  // When user signs out mid-screen, fail closed and reset.
  useEffect(() => {
    if (!initializing && !user) setUi({ status: "idle" });
  }, [initializing, user]);

  // Apply picked exercise from picker exactly once, then clear param.
  useEffect(() => {
    if (!pickedExerciseIdParam) {
      appliedPickRef.current = null;
      return;
    }
    if (!user || ui.status !== "active" || !sessionId) return;
    if (appliedPickRef.current === pickedExerciseIdParam) return;
    appliedPickRef.current = pickedExerciseIdParam;
    void onPickExercise(pickedExerciseIdParam, blockIdParam).finally(() => {
      const returnPath = isEnrichmentEntry ? "/(app)/workouts/enrich" : "/(app)/workouts/log";
      const e =
        typeof params.enrichDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.enrichDay)
          ? params.enrichDay
          : undefined;
      const a =
        typeof params.sessionAnchorIso === "string" && params.sessionAnchorIso.trim().length > 0
          ? params.sessionAnchorIso.trim()
          : undefined;
      const t =
        typeof params.enrichTargetId === "string" && params.enrichTargetId.trim().length > 0
          ? params.enrichTargetId.trim()
          : undefined;
      const j =
        typeof params.journalSessionId === "string" && params.journalSessionId.trim().length > 0
          ? params.journalSessionId.trim()
          : undefined;
      router.replace({
        pathname: returnPath,
        params: {
          ...(e != null ? { enrichDay: e } : {}),
          ...(a != null ? { sessionAnchorIso: a } : {}),
          ...(t != null ? { enrichTargetId: t } : {}),
          ...(j != null ? { journalSessionId: j } : {}),
        },
      });
    });
  }, [
    pickedExerciseIdParam,
    blockIdParam,
    user,
    ui.status,
    sessionId,
    onPickExercise,
    router,
    params.enrichDay,
    params.sessionAnchorIso,
    params.enrichTargetId,
    params.journalSessionId,
    isEnrichmentEntry,
  ]);

  useEffect(() => {
    if (!user || initializing) return;
    if (ui.status !== "active" && ui.status !== "completed") return;
    let cancelled = false;
    listCustomExercises(user.uid)
      .catch(() => [])
      .then((rows) => {
        if (cancelled) return;
        const byId: Record<string, CustomExerciseRecord> = {};
        for (const row of rows) byId[row.exerciseId] = row;
        setCustomExercisesById(byId);
      });
    return () => {
      cancelled = true;
    };
  }, [user, initializing, ui.status]);

  useEffect(() => {
    if (ui.status !== "active" || !reduced?.startedAt) return;
    if (logFlowMode === "backfill") return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ui.status, reduced?.startedAt, logFlowMode]);

  const timerLabel = useMemo(() => {
    if (!reduced?.startedAt) return "00:00";
    const elapsedSec = Math.max(0, Math.floor((nowTick - Date.parse(reduced.startedAt)) / 1000));
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [reduced?.startedAt, nowTick]);

  useEffect(() => {
    if (prefState.status === "error") {
      const base =
        idleLogFlowMode === "backfill"
          ? "Gym preference couldn't be saved. You can still continue and add exercises."
          : "Gym preference couldn't be saved. You can still start your workout.";
      const devDetail =
        __DEV__ && "message" in prefState && prefState.message
          ? ` (${prefState.message})`
          : "";
      setGymSaveError(base + devDetail);
    }
  }, [prefState, idleLogFlowMode]);

  const topInset =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 8 : 12;

  const visibleExercises = useMemo(() => {
    if (!reduced) return [];
    return reduced.exercises.filter((e) => !e.removed);
  }, [reduced]);

  const allBlocks = reduced?.blocks ?? [];
  const displayBlocks = useMemo(() => allBlocks.filter((b) => !b.removed), [allBlocks]);
  const existingBlockIds = useMemo(
    () => (reduced?.blocks != null ? reduced.blocks.map((b) => b.blockId) : []),
    [reduced?.blocks],
  );

  const exercisesByBlockId = useMemo(() => {
    const byBlock = new Map<string, typeof visibleExercises>();
    for (const ex of visibleExercises) {
      const bid = ex.blockId ?? "block:sets:1";
      let arr = byBlock.get(bid);
      if (!arr) {
        arr = [];
        byBlock.set(bid, arr);
      }
      arr.push(ex);
    }
    return byBlock;
  }, [visibleExercises]);

  const hasZeroBlocks = displayBlocks.length === 0;

  const catalogNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const item of EXERCISE_LIBRARY_V1) m.set(item.exerciseId, item.name);
    for (const [exerciseId, row] of Object.entries(customExercisesById)) m.set(exerciseId, row.name);
    return m;
  }, [customExercisesById]);

  const onAddBlockChoose = useCallback(
    async (type: BlockTypeId) => {
      if (!user || !sessionId || !reduced) return;
      setAddBlockModalVisible(false);
      const blockId = nextBlockId(type, existingBlockIds);
      const position = reduced.blocks.length;
      try {
        await createBlock(user.uid, sessionId, {
          blockId,
          blockType: type,
          position,
        });
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, reduced, existingBlockIds, refreshReduced],
  );

  const idleStartChrome = ui.status === "idle" && isSignedIn && !isEnrichmentEntry;
  const isBackfillFlow = logFlowMode === "backfill";

  const safeAreaEdges: readonly ("top" | "left" | "right" | "bottom")[] = idleStartChrome
    ? ["top", "bottom"]
    : ["top"];

  return (
    <SafeAreaView style={[styles.safe, idleStartChrome && styles.safeIdleStart]} edges={safeAreaEdges}>
      <View style={[styles.screen, idleStartChrome && styles.screenIdleStart]}>
      {ui.status === "active" ? (
        isBackfillFlow ? (
          <WorkoutsNavBar
            title={isEnrichmentEntry ? enrichNavTitle : "Add exercises"}
            onBackPress={() => router.back()}
            testID="workout-log-backfill-nav"
          />
        ) : (
          <View style={styles.headerTimerWrap} testID="workout-log-live-timer-wrap">
            <Text style={styles.headerTimer} testID="workout-log-live-timer">
              {timerLabel}
            </Text>
          </View>
        )
      ) : ui.status === "starting" && isEnrichmentEntry ? (
        <WorkoutsNavBar
          title={enrichNavTitle}
          onBackPress={() => router.back()}
          testID="workout-enrich-loading-nav"
        />
      ) : idleStartChrome ? (
        <WorkoutsNavBar hideTitle onBackPress={() => router.back()} />
      ) : null}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={idleStartChrome ? styles.contentIdleStart : styles.content}
        style={idleStartChrome ? styles.scrollIdleStart : undefined}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollContentOffsetY.current = e.nativeEvent.contentOffset.y;
        }}
      >
      {!isSignedIn ? (
        <View style={styles.card}>
          <Text style={styles.title}>Sign in required</Text>
          <Text style={styles.muted}>Sign in to start and save a workout session.</Text>
        </View>
      ) : null}

      {ui.status === "error" ? (
        <View style={styles.errorCard} accessibilityLabel="workout-log-error">
          <Text style={styles.errorTitle}>Action failed</Text>
          <Text style={styles.errorBody}>{ui.message}</Text>
          {ui.canRetryFinishPersist ? (
            <Pressable
              onPress={() => {
                void onRetryFinishPersist();
              }}
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Retry history sync"
            >
              <Text style={styles.primaryBtnText}>Retry sync</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              if (isEnrichmentEntry) {
                router.back();
                return;
              }
              setUi((prev) =>
                prev.status === "active" || prev.status === "completed" ? prev : { status: "idle" },
              );
            }}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <Text style={styles.secondaryBtnText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {ui.status === "idle" ? (
        <>
          <View style={styles.startSetupCardWrap}>
          <View
            style={styles.startSetupCard}
            accessibilityLabel={isBackfillFlow ? "Add exercises setup" : "Start workout setup"}
          >
            {isBackfillFlow ? (
              <View style={styles.startSetupHeader}>
                <Text style={styles.startSetupTitle}>Add exercises</Text>
                <Text style={styles.startSetupSubtitle}>
                  {enrichDayLabel != null
                    ? `For ${enrichDayLabel}. Choose gym, then log your lifts. Save returns you to workout details.`
                    : "Choose gym, then log your lifts. Save returns you to workout details."}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => setGymPickerVisible(true)}
              style={({ pressed }) => [styles.startSetupGymRow, pressed && styles.startSetupGymRowPressed]}
              android_ripple={START_GYM_ROW_RIPPLE}
              accessibilityRole="button"
              accessibilityLabel={`Gym: ${getGymLabel(startScreenGymId ?? null)}. Tap to change.`}
            >
              <Text style={styles.startSetupGymValue}>{getGymLabel(startScreenGymId ?? null)}</Text>
              <Text style={styles.startSetupGymChevron}>›</Text>
            </Pressable>
            {gymSaveError ? (
              <Text style={styles.startSetupErrorText} accessibilityLabel="Gym save error">
                {gymSaveError}
              </Text>
            ) : null}
            <Pressable
              onPress={onStart}
              disabled={!canInteract}
              style={[styles.startSetupPrimaryBtn, !canInteract && styles.primaryBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={isBackfillFlow ? "Continue to add exercises" : "Start workout"}
            >
              <Text style={styles.startSetupPrimaryBtnText}>
                {isBackfillFlow ? "Continue" : "Start workout"}
              </Text>
            </Pressable>
          </View>
          </View>
          {gymPickerVisible && (
            <Modal
              visible
              transparent
              animationType="fade"
              onRequestClose={() => setGymPickerVisible(false)}
            >
              <Pressable
                style={styles.startGymPickerBackdrop}
                onPress={() => setGymPickerVisible(false)}
                accessibilityLabel="Close gym picker"
              >
                <View style={styles.startGymPickerCard} onStartShouldSetResponder={() => true}>
                  <Text style={styles.startGymPickerTitle}>Gym</Text>
                  <Text style={styles.startGymPickerSectionLabel}>Choose your location</Text>
                  {getGymMenuOptions().map((opt) => {
                    const selected =
                      (opt.value === null && startScreenGymId === null) ||
                      (opt.value !== null && startScreenGymId === opt.value);
                    return (
                      <Pressable
                        key={opt.value ?? "none"}
                        onPress={async () => {
                          setStartScreenGymId(opt.value);
                          setGymSaveError(null);
                          setGymPickerVisible(false);
                          try {
                            await setSelectedGymId(opt.value);
                          } catch {
                            setGymSaveError("Gym preference couldn't be saved. You can still start your workout.");
                          }
                        }}
                        style={[styles.startGymOptionRow, selected && styles.startGymOptionRowSelected]}
                        accessibilityRole="button"
                        accessibilityLabel={`Gym: ${opt.label}${selected ? ", selected" : ""}`}
                      >
                        <Text style={styles.startGymOptionLabel}>{opt.label}</Text>
                        {selected ? <Text style={styles.startGymOptionCheck}>✓</Text> : null}
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setGymPickerVisible(false)}
                    style={styles.primaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Text style={styles.primaryBtnText}>Close</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Modal>
          )}
        </>
      ) : null}

      {ui.status === "starting" ? (
        <View style={styles.card}>
          <Text style={styles.title}>
            {isEnrichmentEntry ? "Opening editor…" : isBackfillFlow ? "Opening log…" : "Starting…"}
          </Text>
          <Text style={styles.muted}>
            {isEnrichmentEntry
              ? "Loading exercises for this workout."
              : isBackfillFlow
                ? "Preparing your exercise log."
                : "Creating local session journal."}
          </Text>
        </View>
      ) : null}

      {ui.status === "active" && reduced ? (
        <>
          {hasZeroBlocks ? (
            <View style={styles.card}>
              <Text style={styles.muted}>No blocks yet. Add a block above to start logging exercises.</Text>
            </View>
          ) : (
            displayBlocks.map((block) => {
              const bid = block.blockId;
              const type =
                block.blockType === "warmup" ||
                block.blockType === "sets" ||
                block.blockType === "superset" ||
                block.blockType === "circuit" ||
                block.blockType === "cooldown" ||
                block.blockType === "cardio"
                  ? (block.blockType as BlockTypeId)
                  : blockTypeFromId(block.blockId) ?? null;
              const blockTitle = block.title ?? blockHeaderLabel(type);
              const blockExercises = exercisesByBlockId.get(bid) ?? [];
              return (
                <View key={bid} style={styles.blockSection}>
                  <View style={styles.blockHeaderRow}>
                    <Pressable
                      onPress={() =>
                        setBlockOptions({
                          blockId: bid,
                          title: blockTitle,
                          blockType: block.blockType ?? "sets",
                        })
                      }
                      style={styles.blockTitlePill}
                      accessibilityRole="button"
                      accessibilityLabel={`Block options ${blockTitle}`}
                    >
                      <Text style={styles.blockTitlePillText}>{blockTitle.toUpperCase()}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/workouts/exercise-picker",
                          params: {
                            sessionId,
                            blockId: bid,
                            ...(sessionGymId != null ? { gymId: sessionGymId } : {}),
                            ...(isEnrichmentEntry
                              ? {
                                  logReturnPath: "enrich",
                                  ...(typeof params.enrichDay === "string" ? { enrichDay: params.enrichDay } : {}),
                                  ...(typeof params.enrichTargetId === "string"
                                    ? { enrichTargetId: params.enrichTargetId }
                                    : {}),
                                  ...(typeof params.sessionAnchorIso === "string" &&
                                  params.sessionAnchorIso.trim().length > 0
                                    ? { sessionAnchorIso: params.sessionAnchorIso.trim() }
                                    : {}),
                                  ...(typeof params.journalSessionId === "string" &&
                                  params.journalSessionId.trim().length > 0
                                    ? { journalSessionId: params.journalSessionId.trim() }
                                    : {}),
                                }
                              : {}),
                          },
                        })
                      }
                      style={styles.addExercisePill}
                      accessibilityRole="button"
                      accessibilityLabel={`Add exercise ${blockTitle}`}
                    >
                      <Text style={styles.addExercisePillText}>+ exercise</Text>
                    </Pressable>
                  </View>
                  {blockExercises.map((ex) => {
                    const slotId = ex.slotId;
                    const isExpanded = expandedSlotId === slotId;
                    const displayName = catalogNameById.get(ex.exerciseId) ?? ex.exerciseId;
                    void getExerciseMeta(ex.exerciseId); // reserved for future metadata use
                    const exerciseLoggingType = resolveStrengthLoggingType(
                      ex.exerciseId,
                      customExercisesById[ex.exerciseId]?.loggingType,
                    );
                    const bodyweightLoadEnabled = Boolean(bodyweightLoadEnabledBySlotId[slotId]);
                    const showLoadField =
                      supportsLoadEntry(exerciseLoggingType) ||
                      (exerciseLoggingType === "bodyweight_reps" && bodyweightLoadEnabled);
                    const drafts = draftSetsBySlotId[slotId] ?? [];
                    const loggedSets = ex.sets ?? [];
                    const onToggleExpandWithLayout = (id: string) => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      if (exerciseLoggingType === "bodyweight_reps" && expandedSlotId !== id) {
                        const latest = loggedSets[loggedSets.length - 1] ?? null;
                        const shouldEnable = latest?.loadKg != null && latest.loadKg > 0;
                        setBodyweightLoadEnabledBySlotId((prev) => ({ ...prev, [slotId]: shouldEnable }));
                      }
                      setExpandedSlotId((prev) => (prev === id ? null : id));
                    };
                    const onCollapse = () => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedSlotId(null);
                    };
                    if (isExpanded) {
                      return (
                        <View
                          key={ex.slotId}
                          ref={expandedCardRef}
                          style={styles.exerciseCardWrap}
                          onLayout={() => {
                            if (expandedSlotId !== slotId) return;
                            const cardTag = expandedCardRef.current
                              ? findNodeHandle(expandedCardRef.current)
                              : null;
                            const scrollTag = scrollViewRef.current
                              ? findNodeHandle(scrollViewRef.current)
                              : null;
                            if (cardTag != null && scrollTag != null) {
                              UIManager.measureLayout(
                                cardTag,
                                scrollTag,
                                () => {
                                  /* measureLayout failed; skip scroll */
                                },
                                (_x, y) => {
                                  const nextY = Math.max(
                                    0,
                                    scrollContentOffsetY.current + y - topInset,
                                  );
                                  scrollViewRef.current?.scrollTo({
                                    y: nextY,
                                    animated: true,
                                  });
                                },
                              );
                            }
                          }}
                        >
                          <View style={styles.loggerInlinePanel} accessibilityLabel={`Exercise logger inline ${slotId}`}>
                            <Pressable
                              style={styles.exerciseCardHeaderRow}
                              onPress={onCollapse}
                              accessibilityRole="button"
                              accessibilityLabel={`Collapse ${displayName}`}
                            >
                              <Text style={styles.exerciseCardHeaderTitle} numberOfLines={1}>
                                {displayName}
                              </Text>
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setExerciseMenuSlotId(slotId);
                                }}
                                style={styles.exerciseCardHeaderMenuBtn}
                                accessibilityRole="button"
                                accessibilityLabel={`Exercise options ${displayName}`}
                              >
                                <Text style={styles.exerciseCardHeaderMenuBtnText}>•••</Text>
                              </Pressable>
                            </Pressable>
                            <View style={styles.heroContainerWithSpacing}>
                              <View style={styles.heroMediaContainer}>
                                <ExerciseMediaPreview
                                  exerciseId={ex.exerciseId}
                                  style={styles.heroMediaFill}
                                  containerBackgroundColor="#FFFFFF"
                                />
                              </View>
                            </View>
                            <View style={styles.loggerInlineContent}>
                              <View style={styles.loggerUtilityRow}>
                                <Pressable
                                  onPress={() => {
                                    setDraftSetsBySlotId((prev) => {
                                      const list = prev[slotId] ?? [];
                                      const id = `${slotId}:draft:${list.length}`;
                                      const lastLogged = loggedSets[loggedSets.length - 1] ?? null;
                                      const prefLoadText =
                                        showLoadField && lastLogged?.loadKg != null && lastLogged.loadKg > 0
                                          ? String(Math.round(lastLogged.loadKg * LB_PER_KG * 10) / 10)
                                          : "";
                                      return {
                                        ...prev,
                                        [slotId]: [...list, { id, repsText: "", loadText: prefLoadText, rpeText: "" }],
                                      };
                                    });
                                  }}
                                  style={styles.loggerUtilityAction}
                                  accessibilityRole="button"
                                  accessibilityLabel="Add draft set"
                                >
                                  <Text style={styles.loggerUtilityActionText}>+ Set</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    router.push({
                                      pathname: "/(app)/workouts/exercise-history",
                                      params: { exerciseId: ex.exerciseId },
                                    });
                                  }}
                                  style={styles.loggerUtilityAction}
                                  accessibilityRole="button"
                                  accessibilityLabel="Exercise history"
                                >
                                  <Text style={styles.loggerUtilityActionText}>History</Text>
                                </Pressable>
                                {exerciseLoggingType === "bodyweight_reps" ? (
                                  <Pressable
                                    onPress={() => {
                                      setBodyweightLoadEnabledBySlotId((prev) => {
                                        const nextEnabled = !prev[slotId];
                                        if (!nextEnabled) {
                                          setDraftSetsBySlotId((draftPrev) => {
                                            const list = draftPrev[slotId] ?? [];
                                            if (list.length === 0) return draftPrev;
                                            return {
                                              ...draftPrev,
                                              [slotId]: list.map((row) => ({ ...row, loadText: "" })),
                                            };
                                          });
                                        }
                                        return { ...prev, [slotId]: nextEnabled };
                                      });
                                    }}
                                    style={[
                                      styles.loggerUtilityAction,
                                      bodyweightLoadEnabled && styles.loggerUtilityActionActive,
                                    ]}
                                    accessibilityRole="button"
                                    accessibilityLabel={
                                      bodyweightLoadEnabled
                                        ? "Disable bodyweight external load"
                                        : "Enable bodyweight external load"
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.loggerUtilityActionText,
                                        bodyweightLoadEnabled && styles.loggerUtilityActionTextActive,
                                      ]}
                                    >
                                      {bodyweightLoadEnabled ? "Weighted" : "+ Add weight"}
                                    </Text>
                                  </Pressable>
                                ) : null}
                              </View>
                              <View style={styles.setListInModal}>
                                {(() => {
                                  const useLoadMetrics = supportsLoadEntry(exerciseLoggingType);
                                  const loggedSetVolumeLikeValues = loggedSets.map((set) =>
                                    useLoadMetrics ? getLoggedSetVolumeLb(set) : Math.max(0, set.reps),
                                  );
                                  const maxLoggedSetValue = Math.max(0, ...loggedSetVolumeLikeValues);
                                  return loggedSets.map((s, setIdx) => {
                                    const rightValue = loggedSetVolumeLikeValues[setIdx] ?? 0;
                                    const rawProgress =
                                      maxLoggedSetValue > 0 ? rightValue / maxLoggedSetValue : 0;
                                    const progress =
                                      maxLoggedSetValue > 0
                                        ? Math.max(0.14, Math.min(1, rawProgress))
                                        : 0.34;
                                    const weightLabel = supportsLoadEntry(exerciseLoggingType)
                                      ? formatLoggedSetWeightLabel(s.loadKg ?? null)
                                      : exerciseLoggingType === "bodyweight_reps"
                                        ? formatBodyweightSetLoadLabel(s.loadKg ?? null)
                                        : null;
                                    const canEditLoad =
                                      supportsLoadEntry(exerciseLoggingType) ||
                                      (exerciseLoggingType === "bodyweight_reps" &&
                                        (bodyweightLoadEnabled || (s.loadKg ?? 0) > 0));
                                    const barColor = getLoggedSetBarColor(s.rpe ?? null);
                                    const rpeLabel = s.rpe != null ? String(s.rpe) : "—";
                                    return (
                                      <SwipeableSetRow
                                        key={s.setId}
                                        setId={s.setId}
                                        onDelete={() => void onRemoveSet(s.setId)}
                                        rowContent={
                                          <View style={styles.loggedSetSummaryContent}>
                                            <View style={styles.loggedSetSummaryTopRow}>
                                              <View style={styles.loggedSetSummaryLine}>
                                                <Pressable
                                                  onPress={() =>
                                                    setCompletedSetPicker({ slotId, setId: s.setId, field: "reps" })
                                                  }
                                                  accessibilityRole="button"
                                                  accessibilityLabel={`Edit set ${s.setId} reps`}
                                                >
                                                  <Text style={styles.loggedSetSummaryText}>{`Set ${s.ordinal} - ${s.reps} reps`}</Text>
                                                </Pressable>
                                                {weightLabel != null ? (
                                                  canEditLoad ? (
                                                    <Pressable
                                                      onPress={() =>
                                                        setCompletedSetPicker({ slotId, setId: s.setId, field: "load" })
                                                      }
                                                      accessibilityRole="button"
                                                      accessibilityLabel={`Edit set ${s.setId} weight`}
                                                    >
                                                      <Text style={styles.loggedSetSummaryText}>{` x ${weightLabel}`}</Text>
                                                    </Pressable>
                                                  ) : (
                                                    <Text style={styles.loggedSetSummaryText}>{` x ${weightLabel}`}</Text>
                                                  )
                                                ) : null}
                                                <Pressable
                                                  onPress={() =>
                                                    setCompletedSetPicker({ slotId, setId: s.setId, field: "rpe" })
                                                  }
                                                  accessibilityRole="button"
                                                  accessibilityLabel={`Edit set ${s.setId} RPE`}
                                                >
                                                  <Text style={styles.loggedSetSummaryText}>{` @ ${rpeLabel} RPE`}</Text>
                                                </Pressable>
                                              </View>
                                              <Text style={styles.loggedSetVolumeText}>
                                                {rightValue > 0
                                                  ? useLoadMetrics
                                                    ? String(rightValue)
                                                    : `${rightValue}r`
                                                  : "—"}
                                              </Text>
                                            </View>
                                            <View style={styles.loggedSetBarTrack}>
                                              <View
                                                style={[
                                                  styles.loggedSetBarFill,
                                                  { width: `${progress * 100}%`, backgroundColor: barColor },
                                                ]}
                                              />
                                            </View>
                                          </View>
                                        }
                                      />
                                    );
                                  });
                                })()}
                              {drafts.map((d, idx) => {
                                const activeOrdinal = loggedSets.length + idx + 1;
                                return (
                                  <View key={d.id} style={styles.setRowActive}>
                                    <Text style={[styles.setOrdinalCell, styles.setColSet]}>
                                      {activeOrdinal}
                                    </Text>
                                    <Pressable
                                      onPress={() => setDraftFieldPicker({ slotId, draftId: d.id, field: "reps" })}
                                      style={({ pressed }) => [
                                        styles.draftTapTarget,
                                        pressed && styles.draftTapTargetPressed,
                                      ]}
                                      accessibilityRole="button"
                                      accessibilityLabel="Draft set reps"
                                    >
                                      {d.repsText.trim() ? (
                                        <Text style={styles.draftTapFieldValue} numberOfLines={1}>{d.repsText.trim()}</Text>
                                      ) : (
                                        <Text style={styles.draftTapFieldLabel} numberOfLines={1}>Reps</Text>
                                      )}
                                    </Pressable>
                                    {showLoadField ? (
                                      <Pressable
                                        onPress={() => setDraftFieldPicker({ slotId, draftId: d.id, field: "load" })}
                                        style={({ pressed }) => [
                                          styles.draftTapTarget,
                                          pressed && styles.draftTapTargetPressed,
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityLabel="Draft set load"
                                      >
                                        {d.loadText.trim() ? (
                                          <Text style={styles.draftTapFieldValue} numberOfLines={1}>{formatActiveWeightDisplay(d.loadText)}</Text>
                                        ) : (
                                          <Text style={styles.draftTapFieldLabel} numberOfLines={1}>Weight</Text>
                                        )}
                                      </Pressable>
                                    ) : null}
                                    <Pressable
                                      onPress={() => setDraftFieldPicker({ slotId, draftId: d.id, field: "rpe" })}
                                      style={({ pressed }) => [
                                        styles.draftTapTarget,
                                        pressed && styles.draftTapTargetPressed,
                                      ]}
                                      accessibilityRole="button"
                                      accessibilityLabel="Draft set RPE"
                                    >
                                      {d.rpeText.trim() ? (
                                        <Text style={styles.draftTapFieldValue} numberOfLines={1}>{d.rpeText.trim()}</Text>
                                      ) : (
                                        <Text style={styles.draftTapFieldLabel} numberOfLines={1}>RPE</Text>
                                      )}
                                    </Pressable>
                                    <View style={styles.setColActionWrap}>
                                      <Pressable
                                        onPress={() =>
                                          void onLogDraftSet(slotId, d, exerciseLoggingType, showLoadField)
                                        }
                                        style={styles.logDraftBtn}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Log draft set ${d.id}`}
                                      >
                                        <Text style={styles.logDraftBtnText}>Log</Text>
                                      </Pressable>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                            </View>
                          </View>
                        </View>
                    );
                  }
                  return (
                    <View key={ex.slotId} style={styles.exerciseCardWrap}>
                      <ExerciseListRow
                        ex={ex}
                        displayName={displayName}
                        onToggleExpand={onToggleExpandWithLayout}
                        onDelete={(id) => void onRemoveExercise(id)}
                      />
                    </View>
                  );
                })}
                </View>
              );
            })
          )}

          {(draftFieldPicker || completedSetPicker) && (
            <Modal
              visible
              transparent
              animationType="slide"
              onRequestClose={() => {
        setDraftFieldPicker(null);
        setCompletedSetPicker(null);
      }}
      presentationStyle="pageSheet"
    >
      <Pressable
        style={styles.sheetBackdrop}
        onPress={() => {
          setDraftFieldPicker(null);
          setCompletedSetPicker(null);
        }}
              >
                <Pressable style={styles.draftPickerSheet} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.sheetGrabber} />
                  <Text style={styles.draftPickerSheetTitle}>
                    {(draftFieldPicker?.field ?? completedSetPicker?.field) === "reps"
                      ? "Reps"
                      : (draftFieldPicker?.field ?? completedSetPicker?.field) === "load"
                        ? "Weight (lb)"
                        : "RPE"}
                  </Text>
                  <View style={styles.draftPickerNativeContainer}>
                    {(draftFieldPicker?.field ?? completedSetPicker?.field) === "reps" && (
                      <WheelPicker<number>
                        testID="reps-picker"
                        data={REP_OPTIONS}
                        value={currentPickerValue?.currentReps ?? 1}
                        onValueChange={(n) => {
                          if (draftFieldPicker) {
                            setDraftSetsBySlotId((prev) => {
                              const list = prev[draftFieldPicker.slotId] ?? [];
                              const next = list.map((x) =>
                                x.id === draftFieldPicker.draftId ? { ...x, repsText: String(n) } : x,
                              );
                              return { ...prev, [draftFieldPicker.slotId]: next };
                            });
                          } else if (completedSetPicker) {
                            void onCompletedSetFieldSelect(completedSetPicker.setId, "reps", { reps: n });
                          }
                        }}
                        getOptionLabel={(n) => `${n} reps`}
                        getDisplayLabel={(n) => String(n)}
                      />
                    )}
                    {(draftFieldPicker?.field ?? completedSetPicker?.field) === "load" && (
                      <WheelPicker<string | number>
                        testID="load-picker"
                        data={LOAD_OPTIONS}
                        value={
                          currentPickerValue?.resolvedWeightLb == null || currentPickerValue?.resolvedWeightLb === 0
                            ? "bw"
                            : currentPickerValue!.resolvedWeightLb
                        }
                        onValueChange={(v) => {
                          if (v === "bw") {
                            if (draftFieldPicker) {
                              setDraftSetsBySlotId((prev) => {
                                const list = prev[draftFieldPicker.slotId] ?? [];
                                const next = list.map((x) =>
                                  x.id === draftFieldPicker.draftId ? { ...x, loadText: "" } : x,
                                );
                                return { ...prev, [draftFieldPicker.slotId]: next };
                              });
                            } else if (completedSetPicker) {
                              void onCompletedSetFieldSelect(completedSetPicker.setId, "load", { loadKg: 0 });
                            }
                          } else {
                            const lb = typeof v === "number" ? v : parseFloat(String(v));
                            const loadKg = lb * KG_PER_LB;
                            if (draftFieldPicker) {
                              setDraftSetsBySlotId((prev) => {
                                const list = prev[draftFieldPicker.slotId] ?? [];
                                const next = list.map((x) =>
                                  x.id === draftFieldPicker.draftId ? { ...x, loadText: String(lb) } : x,
                                );
                                return { ...prev, [draftFieldPicker.slotId]: next };
                              });
                            } else if (completedSetPicker) {
                              void onCompletedSetFieldSelect(completedSetPicker.setId, "load", { loadKg });
                            }
                          }
                        }}
                        getOptionLabel={(v) => (v === "bw" ? "Body weight" : `${v} lb`)}
                        getDisplayLabel={(v) => (v === "bw" ? "BW" : String(v))}
                        quickJumpLeft={[
                          {
                            label: "+5",
                            accessibilityLabel: "Add 5 lb",
                            resolve: (v) => {
                              const baseLb = v === "bw" ? 0 : typeof v === "number" ? v : parseFloat(String(v));
                              if (v !== "bw" && typeof v !== "number" && !Number.isFinite(baseLb)) return null;
                              return nearestWeightOptionLb(baseLb + 5);
                            },
                          },
                          {
                            label: "+10",
                            accessibilityLabel: "Add 10 lb",
                            resolve: (v) => {
                              const baseLb = v === "bw" ? 0 : typeof v === "number" ? v : parseFloat(String(v));
                              if (v !== "bw" && typeof v !== "number" && !Number.isFinite(baseLb)) return null;
                              return nearestWeightOptionLb(baseLb + 10);
                            },
                          },
                        ]}
                        quickJumpRight={[
                          {
                            label: "+25",
                            accessibilityLabel: "Add 25 lb",
                            resolve: (v) => {
                              const baseLb = v === "bw" ? 0 : typeof v === "number" ? v : parseFloat(String(v));
                              if (v !== "bw" && typeof v !== "number" && !Number.isFinite(baseLb)) return null;
                              return nearestWeightOptionLb(baseLb + 25);
                            },
                          },
                          {
                            label: "+45",
                            accessibilityLabel: "Add 45 lb",
                            resolve: (v) => {
                              const baseLb = v === "bw" ? 0 : typeof v === "number" ? v : parseFloat(String(v));
                              if (v !== "bw" && typeof v !== "number" && !Number.isFinite(baseLb)) return null;
                              return nearestWeightOptionLb(baseLb + 45);
                            },
                          },
                        ]}
                      />
                    )}
                    {(draftFieldPicker?.field ?? completedSetPicker?.field) === "rpe" && (
                      <WheelPicker<number | "">
                        testID="rpe-picker"
                        data={RPE_OPTIONS}
                        value={currentPickerValue?.currentRpe ?? 1}
                        onValueChange={(v) => {
                          if (v === "") {
                            if (draftFieldPicker) {
                              setDraftSetsBySlotId((prev) => {
                                const list = prev[draftFieldPicker.slotId] ?? [];
                                const next = list.map((x) =>
                                  x.id === draftFieldPicker.draftId ? { ...x, rpeText: "" } : x,
                                );
                                return { ...prev, [draftFieldPicker.slotId]: next };
                              });
                            } else if (completedSetPicker) {
                              setCompletedSetPicker(null);
                            }
                          } else {
                            const rpe = typeof v === "number" ? v : parseInt(String(v), 10);
                            if (draftFieldPicker) {
                              setDraftSetsBySlotId((prev) => {
                                const list = prev[draftFieldPicker.slotId] ?? [];
                                const next = list.map((x) =>
                                  x.id === draftFieldPicker.draftId ? { ...x, rpeText: String(rpe) } : x,
                                );
                                return { ...prev, [draftFieldPicker.slotId]: next };
                              });
                            } else if (completedSetPicker) {
                              void onCompletedSetFieldSelect(completedSetPicker.setId, "rpe", { rpe });
                            }
                          }
                        }}
                        getOptionLabel={(v) => (v === "" ? "No RPE" : `RPE ${v}`)}
                        getDisplayLabel={(v) => (v === "" ? "—" : String(v))}
                      />
                    )}
                  </View>
                  <Pressable
                    style={styles.draftPickerDoneBtn}
                    onPress={() => {
                      setDraftFieldPicker(null);
                      setCompletedSetPicker(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                  >
                    <Text style={styles.draftPickerDoneBtnText}>Done</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          <Modal
            visible={cancelModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setCancelModalVisible(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setCancelModalVisible(false)}>
              <Pressable style={styles.confirmModalContent} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.confirmModalTitle}>Cancel workout?</Text>
                <Text style={styles.muted}>This will abandon the session. You can start a new one later.</Text>
                <View style={styles.confirmModalActions}>
                  <Pressable
                    onPress={() => setCancelModalVisible(false)}
                    style={styles.secondaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Keep session"
                  >
                    <Text style={styles.secondaryBtnText}>Keep session</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onCancelWorkout()}
                    style={styles.cancelConfirmBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm cancel workout"
                  >
                    <Text style={styles.primaryBtnText}>Cancel workout</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={addBlockModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setAddBlockModalVisible(false)}
            presentationStyle="overFullScreen"
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setAddBlockModalVisible(false)}>
              <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetGrabber} />
                <Text style={styles.sheetTitle}>Block type</Text>
                <Text style={styles.muted}>Choose a block to add exercises to.</Text>
                <View style={styles.blockTypeList}>
                  {(["warmup", "sets", "superset", "circuit", "cooldown", "cardio"] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => onAddBlockChoose(type)}
                      style={styles.blockTypeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Block type ${type === "warmup" ? "Warm Up" : type === "sets" ? "Sets" : type === "cooldown" ? "Cool Down" : type === "superset" ? "Superset" : type === "circuit" ? "Circuit" : "Cardio"}`}
                    >
                      <Text style={styles.primaryBtnText}>
                        {type === "warmup"
                          ? "Warm Up"
                          : type === "sets"
                            ? "Sets"
                            : type === "cooldown"
                              ? "Cool Down"
                              : type === "superset"
                                ? "Superset"
                                : type === "circuit"
                                  ? "Circuit"
                                  : "Cardio"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  onPress={() => setAddBlockModalVisible(false)}
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel block choice"
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={blockOptions != null}
            transparent
            animationType="fade"
            onRequestClose={() => setBlockOptions(null)}
            presentationStyle="overFullScreen"
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setBlockOptions(null)}>
              <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                <View style={styles.sheetGrabber} />
                <Text style={styles.sheetTitle}>Block</Text>
                {blockOptions ? (
                  <Text style={styles.sheetSub} accessibilityLabel={`Block type ${blockOptions.title}`}>
                    {blockOptions.title} · {blockHeaderLabel(blockOptions.blockType as BlockTypeId)}
                  </Text>
                ) : null}
                {(["warmup", "sets", "superset", "circuit", "cooldown", "cardio"] as const).map((bt) => (
                  <Pressable
                    key={bt}
                    onPress={async () => {
                      if (!blockOptions || !user || !sessionId) return;
                      try {
                        await updateBlock(user.uid, sessionId, {
                          blockId: blockOptions.blockId,
                          patch: { blockType: bt, title: blockHeaderLabel(bt) },
                        });
                        setBlockOptions(null);
                        await refreshReduced(user.uid, sessionId);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : "Unknown error";
                        setUi({ status: "error", message: msg });
                      }
                    }}
                    style={styles.blockTypeOption}
                    accessibilityRole="button"
                    accessibilityLabel={`Change to ${blockHeaderLabel(bt)}`}
                  >
                    <Text style={styles.blockTypeOptionText}>{blockHeaderLabel(bt)}</Text>
                  </Pressable>
                ))}
                <View style={styles.sheetDivider} />
                <Pressable
                  onPress={() => {
                    if (blockOptions) {
                      setConfirmDeleteBlock({ blockId: blockOptions.blockId, title: blockOptions.title });
                      setBlockOptions(null);
                    }
                  }}
                  style={styles.dangerBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete block"
                >
                  <Text style={styles.dangerBtnText}>Delete block…</Text>
                </Pressable>
                <Pressable
                  onPress={() => setBlockOptions(null)}
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel block options"
                >
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={confirmDeleteBlock != null}
            transparent
            animationType="fade"
            onRequestClose={() => setConfirmDeleteBlock(null)}
            presentationStyle="overFullScreen"
          >
            <Pressable style={styles.sheetBackdrop} onPress={() => setConfirmDeleteBlock(null)}>
              <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.sheetTitle}>Delete block?</Text>
                <Text style={styles.sheetSub}>
                  This will remove the block and all exercises inside it.
                </Text>
                <View style={styles.confirmModalActions}>
                  <Pressable
                    onPress={() => setConfirmDeleteBlock(null)}
                    style={styles.secondaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      if (!confirmDeleteBlock || !user || !sessionId || !reduced) return;
                      const { blockId } = confirmDeleteBlock;
                      const slotIds = reduced.exercises
                        .filter((ex) => ex.blockId === blockId && !ex.removed)
                        .map((ex) => ex.slotId);
                      try {
                        for (const slotId of slotIds) {
                          await removeExercise(user.uid, sessionId, slotId);
                        }
                        await removeBlock(user.uid, sessionId, blockId);
                        setConfirmDeleteBlock(null);
                        await refreshReduced(user.uid, sessionId);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : "Unknown error";
                        setUi({ status: "error", message: msg });
                      }
                    }}
                    style={styles.dangerBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Delete"
                  >
                    <Text style={styles.dangerBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

        </>
      ) : null}

      {ui.status === "completed" && reduced ? (
        <View style={styles.card} accessibilityLabel="workout-complete">
          <Text style={styles.title}>Completed</Text>
          <Text style={styles.mutedSmall}>Session ID: {sessionId}</Text>
          <Text style={styles.muted}>
            Exercises: {reduced.exercises.filter((e) => !e.removed).length} · Total events: {reduced.eventCount}
          </Text>
        </View>
      ) : null}
      </ScrollView>

      {ui.status === "active" && reduced ? (
        <View style={styles.bottomNav}>
          <View style={styles.bottomNavInner}>
            <Pressable
              onPress={() => setAddBlockModalVisible(true)}
              style={styles.circleBtn}
              accessibilityRole="button"
              accessibilityLabel="Add block"
            >
              <Text style={styles.circleBtnText}>＋</Text>
            </Pressable>
            <Pressable
              onPress={() => setFinishModalVisible(true)}
              style={styles.finishBtn}
              accessibilityRole="button"
              accessibilityLabel={isBackfillFlow ? "Save exercises" : "Finish workout"}
            >
              <Text style={styles.finishBtnText}>{isBackfillFlow ? "Save" : "Finish"}</Text>
            </Pressable>
            {isBackfillFlow ? (
              <View style={styles.circleBtnSpacer} accessibilityElementsHidden />
            ) : (
              <Pressable
                onPress={() => setRestTimerPanelVisible(!restTimerPanelVisible)}
                style={styles.circleBtn}
                accessibilityRole="button"
                accessibilityLabel="Timer"
              >
                <Text style={styles.circleBtnText}>⏱</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      {/* Exercise menu (hero •••) + Edit set modal at root */}
      <Modal
        visible={exerciseMenuSlotId != null}
        transparent
        animationType="fade"
        onRequestClose={() => setExerciseMenuSlotId(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setExerciseMenuSlotId(null)}>
          <Pressable style={styles.confirmModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmModalTitle}>Exercise</Text>
            <View style={styles.confirmModalActions}>
              <Pressable
                onPress={() => {
                  const sid = exerciseMenuSlotId;
                  setExerciseMenuSlotId(null);
                  if (sid) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setExpandedSlotId(null);
                    void onRemoveExercise(sid);
                  }
                }}
                style={styles.cancelConfirmBtn}
                accessibilityRole="button"
                accessibilityLabel="Remove exercise from logger"
              >
                <Text style={styles.primaryBtnText}>Remove exercise</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setExerciseMenuSlotId(null)}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={editSetDraft != null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditSetDraft(null)}
        presentationStyle="overFullScreen"
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setEditSetDraft(null)}>
          <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Edit set</Text>
            {editSetDraft ? (
              <>
                <Text style={styles.fieldLabel}>REPS</Text>
                <TextInput
                  value={editSetDraft.repsText}
                  onChangeText={(t) =>
                    setEditSetDraft((prev) => (prev ? { ...prev, repsText: t } : prev))
                  }
                  placeholder="Reps"
                  keyboardType="number-pad"
                  style={styles.fieldInput}
                  accessibilityLabel="Edit set reps"
                />
                <Text style={styles.fieldLabel}>LOAD (lb)</Text>
                <TextInput
                  value={editSetDraft.loadText}
                  onChangeText={(t) =>
                    setEditSetDraft((prev) => (prev ? { ...prev, loadText: t } : prev))
                  }
                  placeholder="Load (lb)"
                  keyboardType="decimal-pad"
                  style={styles.fieldInput}
                  accessibilityLabel="Edit set load"
                />
                <Text style={styles.fieldLabel}>RPE (0–10)</Text>
                <TextInput
                  value={editSetDraft.intensityText}
                  onChangeText={(t) =>
                    setEditSetDraft((prev) => (prev ? { ...prev, intensityText: t } : prev))
                  }
                  placeholder="RPE 0–10"
                  keyboardType="number-pad"
                  style={styles.fieldInput}
                  accessibilityLabel="Edit set RPE"
                />
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => void onSaveEditSet()}
                    style={styles.primaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Save set edits"
                  >
                    <Text style={styles.primaryBtnText}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditSetDraft(null)}
                    style={styles.secondaryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel set edits"
                  >
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => {
                    if (editSetDraft) {
                      void onRemoveSet(editSetDraft.setId);
                      setEditSetDraft(null);
                    }
                  }}
                  style={styles.dangerBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete set"
                >
                  <Text style={styles.dangerBtnText}>Delete set</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={finishModalVisible}
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setFinishModalVisible(false)}
      >
        <Pressable style={styles.finishBackdrop} onPress={() => setFinishModalVisible(false)}>
          <Pressable style={styles.finishSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            <Text
              style={styles.finishSheetTitle}
              accessibilityLabel={isBackfillFlow ? "Save exercises?" : "Finish workout?"}
            >
              {isBackfillFlow ? "Save exercises?" : "Finish workout?"}
            </Text>
            <Text style={styles.finishSheetSubtitle}>
              {isBackfillFlow
                ? "This will save your exercises to this workout."
                : "This will save your workout."}
            </Text>
            <View style={styles.finishSheetActions}>
              <Pressable
                onPress={() => {
                  setFinishModalVisible(false);
                  void onFinish();
                }}
                style={styles.finishSheetPrimary}
                accessibilityRole="button"
                accessibilityLabel={isBackfillFlow ? "Save exercises" : "Confirm finish workout"}
              >
                <Text style={styles.finishSheetPrimaryText}>
                  {isBackfillFlow ? "Save" : "Finish"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFinishModalVisible(false)}
                style={styles.finishSheetSecondary}
                accessibilityRole="button"
                accessibilityLabel={isBackfillFlow ? "Keep editing" : "Keep working"}
              >
                <Text style={styles.finishSheetSecondaryText}>
                  {isBackfillFlow ? "Keep editing" : "Keep working"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setFinishModalVisible(false);
                  setCancelConfirmVisible(true);
                }}
                style={styles.finishSheetTertiary}
                accessibilityRole="button"
                accessibilityLabel={isBackfillFlow ? "Discard exercise log" : "Cancel workout"}
              >
                <Text style={styles.finishSheetTertiaryText}>
                  {isBackfillFlow ? "Discard log" : "Cancel workout"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={cancelConfirmVisible}
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setCancelConfirmVisible(false)}
      >
        <Pressable style={styles.finishBackdrop} onPress={() => setCancelConfirmVisible(false)}>
          <Pressable style={styles.finishSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            <Text style={styles.finishSheetTitle}>
              {isBackfillFlow ? "Discard exercise log?" : "Cancel workout?"}
            </Text>
            <Text style={styles.finishSheetSubtitle}>
              {isBackfillFlow
                ? "This will discard this exercise log."
                : "This will discard this workout."}
            </Text>
            <View style={styles.finishSheetActions}>
              <Pressable
                onPress={() => {
                  setCancelConfirmVisible(false);
                  void onCancelWorkout();
                }}
                style={styles.finishSheetPrimaryDestructive}
                accessibilityRole="button"
                accessibilityLabel={isBackfillFlow ? "Confirm discard exercise log" : "Confirm cancel workout"}
              >
                <Text style={styles.finishSheetPrimaryText}>
                  {isBackfillFlow ? "Discard log" : "Cancel workout"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setCancelConfirmVisible(false)}
                style={styles.finishSheetSecondary}
                accessibilityRole="button"
                accessibilityLabel={
                  isBackfillFlow ? "Keep editing after discard prompt" : "Keep working after cancel prompt"
                }
              >
                <Text style={styles.finishSheetSecondaryText}>
                  {isBackfillFlow ? "Keep editing" : "Keep working"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
    </SafeAreaView>
  );
}

export default function WorkoutLogRoute() {
  return <WorkoutLogScreenInner sessionEntry="live" />;
}

/** Active draft row ordinal column width. */
const GRID_COL_SET = 26;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F2F2F7" },
  screen: { flex: 1, backgroundColor: "#F2F2F7" },
  safeIdleStart: { backgroundColor: "#FFFFFF" },
  screenIdleStart: { backgroundColor: "#FFFFFF" },
  scrollIdleStart: { flex: 1, backgroundColor: "#FFFFFF" },
  contentIdleStart: {
    flex: 1,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  startSetupCardWrap: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  headerTimerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 36,
    marginBottom: 12,
  },
  headerTimer: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  topBarText: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  startCtaBlock: {
    marginTop: 100,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  startSetupCard: {
    paddingVertical: 4,
  },
  startSetupHeader: {
    marginBottom: 12,
    gap: 12,
  },
  startSetupTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: -0.5,
  },
  startSetupSubtitle: {
    fontSize: 15,
    color: "#AEAEB2",
    lineHeight: 22,
    letterSpacing: -0.15,
  },
  startSetupGymRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F7FA",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  startSetupGymRowPressed: {
    backgroundColor: "#F0F0F4",
    borderColor: "rgba(60, 60, 67, 0.18)",
  },
  startSetupGymValue: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  startSetupGymChevron: { fontSize: 22, fontWeight: "500", color: "#AEAEB2", marginRight: 2 },
  startSetupPrimaryBtn: {
    alignSelf: "stretch",
    minHeight: 54,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        }
      : { elevation: 3 }),
  },
  startSetupPrimaryBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.2 },
  startSetupErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#B00020",
  },
  startGymPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
    padding: 24,
  },
  startGymPickerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  startGymPickerTitle: { fontSize: 20, fontWeight: "700", color: "#1C1C1E", textAlign: "center" },
  startGymPickerSectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  startGymOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  startGymOptionRowSelected: { borderColor: SYSTEM_ACCENT, backgroundColor: SYSTEM_ACCENT_OVERLAY_08 },
  startGymOptionLabel: { fontSize: 16, fontWeight: "500", color: "#1C1C1E" },
  startGymOptionCheck: { fontSize: 16, fontWeight: "700", color: SYSTEM_ACCENT },
  content: { padding: 16, paddingBottom: 110, gap: 16 },
  bottomNav: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomNavInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    ...(Platform.OS === "android" ? { elevation: 3 } : {}),
  },
  circleBtnSpacer: {
    width: 48,
    height: 48,
  },
  circleBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  finishBtn: {
    backgroundColor: SYSTEM_ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        }
      : { elevation: 3 }),
  },
  finishBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  finishConfirmRedBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    alignItems: "center",
  },
  finishSheetActions: {
    gap: 10,
    marginTop: 18,
  },
  finishSheetPrimary: {
    backgroundColor: SYSTEM_ACCENT,
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  finishSheetPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  finishSheetPrimaryDestructive: {
    backgroundColor: "#FF3B30",
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  finishSheetSecondary: {
    backgroundColor: "#F2F2F7",
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  finishSheetSecondaryText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "700",
  },
  finishSheetTertiary: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  finishSheetTertiaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF3B30",
  },
  bottomRow: { flexDirection: "row", gap: 10 },
  bottomBtnPrimary: {
    flex: 1,
    backgroundColor: SYSTEM_ACCENT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  bottomBtnSecondary: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  bottomBtnTextPrimary: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  bottomBtnTextSecondary: { color: "#1C1C1E", fontWeight: "800", fontSize: 16 },
  bottomBtnBlock: {
    width: 110,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  addBlockHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SYSTEM_ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  addBlockHeaderBtnText: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  card: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#1C1C1E" },
  exerciseTitle: { fontSize: 16, fontWeight: "700", color: "#1C1C1E" },
  muted: { fontSize: 14, color: "#3C3C43" },
  mutedSmall: { fontSize: 12, color: "#6E6E73", fontFamily: "monospace" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    fontSize: 14,
  },
  inputSmall: { flex: 0, width: 90 },
  inputTiny: { flex: 0, width: 56 },
  primaryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 10,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 10,
  },
  smallBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  secondaryBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: "#3C3C43" },
  actionRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 8 },
  setList: { gap: 4 },
  blockSection: { marginBottom: 16 },
  blockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#E8E8ED",
    borderRadius: 12,
  },
  blockTitlePill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  blockTitlePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1C1C1E",
    letterSpacing: 0.8,
  },
  addExercisePill: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addExercisePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  addExerciseIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  addExerciseIconText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  blockMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  blockMenuBtnText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3C3C43",
  },
  addExerciseInBlockBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 8,
  },
  addExerciseInBlockBtnText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  exerciseListRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  exerciseListRowThumbnailContainer: {
    width: 120,
    height: 68,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  exerciseListRowThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  exerciseListRowCenter: { flex: 1 },
  exerciseListRowName: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  exerciseListRowSets: { fontSize: 13, color: "#6E6E73", marginTop: 2 },
  exerciseListRowMore: { padding: 8 },
  moreDots: { fontSize: 16, fontWeight: "700", color: "#8E8E93" },
  exerciseCardWrap: { marginBottom: 8 },
  loggerInlinePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
  },
  exerciseCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  exerciseCardHeaderTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    marginRight: 8,
  },
  exerciseCardHeaderMenuBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  exerciseCardHeaderMenuBtnText: { fontSize: 20, fontWeight: "600", color: "#8E8E93" },
  heroContainer: {
    width: "100%",
  },
  heroContainerWithSpacing: {
    width: "100%",
    marginTop: 16,
  },
  heroMediaContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  heroMediaFill: {
    width: "100%",
    height: "100%",
  },
  loggerInlineContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 16 },
  exerciseLoggerBackBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 0 },
  exerciseLoggerScroll: { flex: 1 },
  exerciseLoggerScrollContent: { padding: 16, paddingBottom: 32 },
  exerciseLoggerName: { fontSize: 22, fontWeight: "800", color: "#1C1C1E", marginBottom: 4 },
  exerciseLoggerBlockLabel: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  loggerUtilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 14,
    paddingVertical: 8,
  },
  loggerUtilityAction: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  loggerUtilityActionText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FF3B30",
  },
  loggerUtilityActionActive: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
  },
  loggerUtilityActionTextActive: {
    color: "#FFFFFF",
  },
  setListInModal: { gap: 4, marginBottom: 12 },
  setColSet: { width: GRID_COL_SET },
  setPlaceholderCell: { minHeight: 40, justifyContent: "center" },
  swipeableRowWrap: {
    minHeight: 40,
    overflow: "hidden",
    marginBottom: 4,
    borderRadius: 10,
  },
  swipeableRowDeleteBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#FF3B30",
  },
  swipeableRowDeleteBtn: {
    width: SWIPE_REVEAL_WIDTH,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  swipeableRowDeleteText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  setRowCompleted: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F7F7F8",
    borderRadius: 10,
  },
  setOrdinalCell: { fontSize: 15, fontWeight: "500", color: "#6B7280", textAlign: "left" },
  loggedSetSummaryContent: { gap: 8 },
  loggedSetSummaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  loggedSetSummaryLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  loggedSetSummaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  loggedSetVolumeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3A3A3C",
    minWidth: 40,
    textAlign: "right",
  },
  loggedSetBarTrack: {
    height: 6,
    backgroundColor: "#E5E5EA",
    borderRadius: 3,
    overflow: "hidden",
  },
  loggedSetBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  setRowActive: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    marginTop: 8,
  },
  draftInput: {
    flex: 0,
    height: 50,
    minWidth: 64,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
  },
  draftInputSmall: {
    flex: 0,
    height: 50,
    minWidth: 48,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
  },
  draftTapTarget: {
    flex: 1,
    minWidth: 52,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    ...(Platform.OS === "android" ? { elevation: 2 } : {}),
  },
  draftTapTargetPressed: {
    opacity: 0.92,
    backgroundColor: "#F5F5F7",
  },
  draftTapFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1C1C1E",
    textAlign: "center",
  },
  draftTapFieldValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    textAlign: "center",
  },
  draftPickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "70%",
  },
  draftPickerNativeContainer: {
    minHeight: 220,
    marginVertical: 8,
  },
  draftPickerNative: {
    flex: 1,
  },
  draftPickerNativeItem: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  draftPickerDoneBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    marginTop: 8,
  },
  draftPickerDoneBtnText: { fontSize: 17, fontWeight: "600", color: SYSTEM_ACCENT },
  logDraftBtn: {
    width: 56,
    minHeight: 44,
    paddingVertical: 0,
    paddingHorizontal: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1677FF",
    borderRadius: 10,
  },
  setColActionWrap: {
    width: 56,
    flex: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logDraftBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  addSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  addSetSmallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  addSetSmallBtnText: { fontSize: 16, fontWeight: "600", color: SYSTEM_ACCENT },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  finishBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 24,
  },
  finishSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    marginBottom: 0,
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 24,
    maxHeight: "78%",
  },
  sheetGrabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C7C7CC",
    marginBottom: 12,
  },
  finishSheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 8,
  },
  finishSheetSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
    lineHeight: 22,
    textAlign: "center",
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#1C1C1E", marginBottom: 12 },
  draftPickerSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
    textAlign: "center",
  },
  sheetSub: { fontSize: 14, color: "#6E6E73", marginBottom: 12 },
  sheetDivider: { height: 1, backgroundColor: "#E5E5EA", marginVertical: 12 },
  blockTypeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#F2F2F7",
    marginBottom: 8,
  },
  blockTypeOptionText: { fontSize: 16, fontWeight: "600", color: "#1C1C1E" },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6E6E73",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  fieldInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 17,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    marginBottom: 4,
  },
  actionsRow: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 8 },
  dangerBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    alignItems: "center",
    marginTop: 8,
  },
  dangerBtnText: { fontSize: 15, fontWeight: "700", color: "#FF3B30" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
  },
  confirmModalTitle: { fontSize: 18, fontWeight: "800", color: "#1C1C1E", marginBottom: 8 },
  confirmModalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  blockTypeList: { gap: 10, marginTop: 12, marginBottom: 12 },
  blockTypeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    alignItems: "center",
  },
  errorCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  errorTitle: { fontSize: 16, fontWeight: "800", color: "#B00020" },
  errorBody: { fontSize: 14, color: "#B00020" },
});
