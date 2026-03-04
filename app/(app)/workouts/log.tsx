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
} from "react-native";

if (
  typeof Platform !== "undefined" &&
  Platform.OS === "android" &&
  UIManager?.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";
import { buildExerciseMemory, type ExerciseMemoryMap } from "@/lib/workouts/memory/exerciseMemory";
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
import { loadReducedSession } from "@/lib/workouts/sessionEngine/selectors";
import {
  clearActiveWorkoutSessionId,
  getActiveWorkoutSessionId,
  setActiveWorkoutSessionId,
} from "@/lib/workouts/sessionEngine/activeSessionStorage";
import { EXERCISE_CATALOG_V1 } from "@/lib/workouts/exercises/catalog";
import { getExerciseMeta } from "@/lib/workouts/exercises/metadata";

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

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
        <View style={styles.thumbnailPlaceholder} />
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

export default function WorkoutLogScreen() {
  const { user, initializing } = useAuth();

  type UiState =
    | { status: "idle" }
    | { status: "starting" }
    | { status: "active"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "completed"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "error"; message: string };

  const router = useRouter();
  const params = useLocalSearchParams<{ pickedExerciseId?: string; blockId?: string }>();
  const pickedExerciseIdParam = typeof params.pickedExerciseId === "string" ? params.pickedExerciseId : undefined;
  const blockIdParam = typeof params.blockId === "string" ? params.blockId : undefined;
  const appliedPickRef = useRef<string | null>(null);

  const [ui, setUi] = useState<UiState>({ status: "idle" });
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
  const [timerStubModalVisible, setTimerStubModalVisible] = useState(false);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [exerciseMenuSlotId, setExerciseMenuSlotId] = useState<string | null>(null);
  const [draftSetsBySlotId, setDraftSetsBySlotId] = useState<Record<string, DraftSet[]>>({});
  const [editSetDraft, setEditSetDraft] = useState<{
    setId: string;
    slotId: string;
    repsText: string;
    loadText: string;
    intensityText: string;
  } | null>(null);
  const [memory, setMemory] = useState<ExerciseMemoryMap>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  const isSignedIn = Boolean(user) && !initializing;

  const sessionState =
    ui.status === "active" || ui.status === "completed"
      ? { reduced: ui.reduced, sessionId: ui.sessionId }
      : null;
  const reduced = sessionState?.reduced ?? null;
  const sessionId = sessionState?.sessionId ?? null;

  const canInteract = isSignedIn && ui.status !== "starting";

  const refreshReduced = useCallback(async (uid: string, sid: string) => {
    const next = await loadReducedSession(uid, sid);
    setUi((prev) => {
      if (prev.status === "active" && prev.sessionId === sid) return { ...prev, reduced: next };
      if (prev.status === "completed" && prev.sessionId === sid) return { ...prev, reduced: next };
      return prev;
    });
  }, []);

  // Resume active session (fail-closed):
  // - If pointer exists, attempt to load reduced state
  // - If load fails, clear pointer and return to idle
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || initializing) return;
      if (ui.status !== "idle") return;
      try {
        const sid = await getActiveWorkoutSessionId(user.uid);
        if (!sid) return;
        const next = await loadReducedSession(user.uid, sid);
        if (cancelled) return;
        setUi({ status: "active", sessionId: sid, reduced: next });
      } catch {
        // Fail-closed: clear pointer if corrupted / cannot load
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
  }, [user, initializing, ui.status]);

  const onStart = useCallback(async () => {
    if (!user) {
      setUi({ status: "error", message: "Not signed in." });
      return;
    }
    setUi({ status: "starting" });
    try {
      const { sessionId } = await createSessionDraft(user.uid);
      await startSession(user.uid, sessionId);
      await setActiveWorkoutSessionId(user.uid, sessionId);
      const reduced = await loadReducedSession(user.uid, sessionId);
      setUi({ status: "active", sessionId, reduced });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user]);

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

  const onLogDraftSet = useCallback(
    async (slotId: string, draft: DraftSet) => {
      if (!user || !sessionId || !reduced) return;
      const reps = parsePositiveInt(draft.repsText);
      if (reps == null) {
        setUi({ status: "error", message: "Reps are required." });
        return;
      }
      const loadLb = draft.loadText.trim() === "" ? undefined : parsePositiveFloat(draft.loadText);
      if (draft.loadText.trim() !== "" && loadLb == null) {
        setUi({ status: "error", message: "Load must be > 0 when provided." });
        return;
      }
      const loadKg = loadLb != null ? loadLb * KG_PER_LB : undefined;
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
          return { ...prev, [slotId]: list.filter((d) => d.id !== draft.id) };
        });
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
      await clearActiveWorkoutSessionId(user.uid);
      setUi({ status: "idle" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user, sessionId]);

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
    try {
      await completeSession(user.uid, sessionId);
      await clearActiveWorkoutSessionId(user.uid);
      const next = await loadReducedSession(user.uid, sessionId);
      setUi({ status: "completed", sessionId, reduced: next });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user, sessionId]);

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
      router.replace("/(app)/workouts/log");
    });
  }, [pickedExerciseIdParam, blockIdParam, user, ui.status, sessionId, onPickExercise, router]);

  useEffect(() => {
    if (!user || initializing) return;
    let cancelled = false;
    buildExerciseMemory(user.uid)
      .catch(() => ({} as ExerciseMemoryMap))
      .then((mem) => {
        if (!cancelled) setMemory(mem);
      });
    return () => {
      cancelled = true;
    };
  }, [user, initializing]);

  useEffect(() => {
    if (ui.status !== "active" || !reduced?.startedAt) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ui.status, reduced?.startedAt]);

  const timerLabel = useMemo(() => {
    if (!reduced?.startedAt) return "00:00";
    const elapsedSec = Math.max(0, Math.floor((nowTick - Date.parse(reduced.startedAt)) / 1000));
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [reduced?.startedAt, nowTick]);

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
    void memory; // reserved for future exercise memory (e.g. Last/Best in row)
    const m = new Map<string, string>();
    for (const item of EXERCISE_CATALOG_V1) m.set(item.exerciseId, item.name);
    return m;
  }, [memory]);

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

  return (
    <View style={styles.screen}>
      {ui.status === "active" ? (
        <View style={[styles.headerTimerWrap, { paddingTop: topInset }]}>
          <Text style={styles.headerTimer}>{timerLabel}</Text>
        </View>
      ) : ui.status === "idle" && isSignedIn ? (
        <View style={[styles.startScreenHeader, { paddingTop: topInset }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <Pressable
            onPress={() => setUi((prev) => (prev.status === "active" || prev.status === "completed" ? prev : { status: "idle" }))}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
          >
            <Text style={styles.secondaryBtnText}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {ui.status === "idle" ? (
        <View style={styles.startCtaBlock}>
          <Text style={styles.title}>Start an empty workout</Text>
          <Text style={styles.muted}>
            Offline-first: everything is recorded to a local append-only journal, then can be synced later.
          </Text>
          <Pressable
            onPress={onStart}
            disabled={!canInteract}
            style={[styles.primaryBtn, !canInteract && styles.primaryBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Start workout"
          >
            <Text style={styles.primaryBtnText}>Start workout</Text>
          </Pressable>
        </View>
      ) : null}

      {ui.status === "starting" ? (
        <View style={styles.card}>
          <Text style={styles.title}>Starting…</Text>
          <Text style={styles.muted}>Creating local session journal.</Text>
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
                          params: { sessionId, blockId: bid },
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
                    const block = ex.blockId != null ? displayBlocks.find((b) => b.blockId === ex.blockId) : null;
                    const blockTitle = block?.title ?? "Block";
                    const displayName = catalogNameById.get(ex.exerciseId) ?? ex.exerciseId;
                    void getExerciseMeta(ex.exerciseId); // reserved for future metadata use
                    const drafts = draftSetsBySlotId[slotId] ?? [];
                    const loggedSets = ex.sets ?? [];
                    const onToggleExpandWithLayout = (id: string) => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedSlotId((prev) => (prev === id ? null : id));
                    };
                    const onCollapse = () => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setExpandedSlotId(null);
                    };
                    if (isExpanded) {
                      return (
                        <View key={ex.slotId} style={styles.exerciseCardWrap}>
                          <View style={styles.loggerInlinePanel} accessibilityLabel={`Exercise logger inline ${slotId}`}>
                            <View style={styles.heroContainer}>
                              <Pressable
                                style={styles.heroPressable}
                                onPress={onCollapse}
                                accessibilityRole="button"
                                accessibilityLabel={`Collapse ${displayName}`}
                              >
                                <View style={styles.heroPlaceholder} />
                                <View style={styles.heroOverlay}>
                                  <Text style={styles.heroNameOverlay} numberOfLines={2}>
                                    {displayName}
                                  </Text>
                                  <Pressable
                                    onPress={(e) => {
                                      e.stopPropagation();
                                      setExerciseMenuSlotId(slotId);
                                    }}
                                    style={styles.heroMenuBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Exercise options ${displayName}`}
                                  >
                                    <Text style={styles.heroMenuBtnText}>•••</Text>
                                  </Pressable>
                                </View>
                              </Pressable>
                            </View>
                            <View style={styles.loggerInlineContent}>
                              <View style={styles.addSetRow}>
                                <Text style={styles.exerciseLoggerBlockLabel}>{blockTitle}</Text>
                                <Pressable
                                  onPress={() => {
                                    setDraftSetsBySlotId((prev) => {
                                      const list = prev[slotId] ?? [];
                                      const id = `${slotId}:draft:${list.length}`;
                                      return { ...prev, [slotId]: [...list, { id, repsText: "", loadText: "", rpeText: "" }] };
                                    });
                                  }}
                                  style={styles.addSetSmallBtn}
                                  accessibilityRole="button"
                                  accessibilityLabel="Add draft set"
                                >
                                  <Text style={styles.addSetSmallBtnText}>+ Add set</Text>
                                </Pressable>
                              </View>
                              <View style={styles.setListInModal}>
                              {loggedSets.map((s) => {
                                const lbDisplay = s.loadKg != null ? (s.loadKg * LB_PER_KG).toFixed(1) : "BW";
                                const rpePart = s.rpe != null ? ` @${s.rpe}` : "";
                                return (
                                  <View key={s.setId} style={styles.setRowInModal}>
                                    <Text style={styles.setOrdinal}>{s.ordinal}</Text>
                                    <Text style={styles.setRowMiddle}>
                                      {s.reps} reps · {lbDisplay} lb{rpePart}
                                    </Text>
                                    <View style={styles.setRowRight}>
                                      <Text style={styles.donePill}>✓ Done</Text>
                                      <Pressable
                                        onPress={() => {
                                          if (!reduced) return;
                                          const exercise = reduced.exercises.find((e) => e.slotId === slotId);
                                          const set = exercise?.sets.find((t) => t.setId === s.setId);
                                          if (!exercise || !set) {
                                            setUi({ status: "error", message: "Set not found." });
                                            return;
                                          }
                                          setEditSetDraft({
                                            setId: set.setId,
                                            slotId: exercise.slotId,
                                            repsText: String(set.reps),
                                            loadText: set.loadKg != null ? (set.loadKg * LB_PER_KG).toFixed(1) : "",
                                            intensityText: set.rpe != null ? String(set.rpe) : "",
                                          });
                                        }}
                                        style={styles.setOptionsInModal}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Set options ${s.setId}`}
                                      >
                                        <Text style={styles.moreDots}>•••</Text>
                                      </Pressable>
                                    </View>
                                  </View>
                                );
                              })}
                              {drafts.map((d, idx) => (
                                <View key={d.id} style={styles.setRowInModal}>
                                  <Text style={styles.setOrdinal}>{loggedSets.length + idx + 1}</Text>
                                  <View style={styles.draftInputsRow}>
                                    <TextInput
                                      value={d.repsText}
                                      onChangeText={(t) =>
                                        setDraftSetsBySlotId((prev) => {
                                          const list = prev[slotId] ?? [];
                                          const next = list.map((x) => (x.id === d.id ? { ...x, repsText: t } : x));
                                          return { ...prev, [slotId]: next };
                                        })
                                      }
                                      placeholder="Reps"
                                      keyboardType="number-pad"
                                      style={[styles.input, styles.draftInput]}
                                      accessibilityLabel="Draft set reps"
                                    />
                                    <TextInput
                                      value={d.loadText}
                                      onChangeText={(t) =>
                                        setDraftSetsBySlotId((prev) => {
                                          const list = prev[slotId] ?? [];
                                          const next = list.map((x) => (x.id === d.id ? { ...x, loadText: t } : x));
                                          return { ...prev, [slotId]: next };
                                        })
                                      }
                                      placeholder="lb"
                                      keyboardType="decimal-pad"
                                      style={[styles.input, styles.draftInput]}
                                      accessibilityLabel="Draft set load"
                                    />
                                    <TextInput
                                      value={d.rpeText}
                                      onChangeText={(t) =>
                                        setDraftSetsBySlotId((prev) => {
                                          const list = prev[slotId] ?? [];
                                          const next = list.map((x) => (x.id === d.id ? { ...x, rpeText: t } : x));
                                          return { ...prev, [slotId]: next };
                                        })
                                      }
                                      placeholder="RPE"
                                      keyboardType="number-pad"
                                      style={[styles.input, styles.draftInputSmall]}
                                      accessibilityLabel="Draft set RPE"
                                    />
                                  </View>
                                  <Pressable
                                    onPress={() => void onLogDraftSet(slotId, d)}
                                    style={styles.logDraftBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Log draft set ${d.id}`}
                                  >
                                    <Text style={styles.primaryBtnText}>Log</Text>
                                  </Pressable>
                                </View>
                              ))}
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
              accessibilityLabel="Finish workout"
            >
              <Text style={styles.finishBtnText}>Finish</Text>
            </Pressable>
            <Pressable
              onPress={() => setTimerStubModalVisible(true)}
              style={styles.circleBtn}
              accessibilityRole="button"
              accessibilityLabel="Timer"
            >
              <Text style={styles.circleBtnText}>⏱</Text>
            </Pressable>
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
            <Text style={styles.sheetTitle} accessibilityLabel="Finish workout?">
              Finish workout?
            </Text>
            <Text style={styles.muted}>This will seal the workout.</Text>
            <View style={styles.finishSheetActions}>
              <Pressable
                onPress={() => {
                  setFinishModalVisible(false);
                  void onFinish();
                }}
                style={styles.finishSheetPrimary}
                accessibilityRole="button"
                accessibilityLabel="Confirm finish workout"
              >
                <Text style={styles.finishSheetPrimaryText}>Finish</Text>
              </Pressable>
              <Pressable
                onPress={() => setFinishModalVisible(false)}
                style={styles.finishSheetSecondary}
                accessibilityRole="button"
                accessibilityLabel="Keep working"
              >
                <Text style={styles.finishSheetSecondaryText}>Keep working</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setFinishModalVisible(false);
                  setCancelConfirmVisible(true);
                }}
                style={styles.finishSheetSecondary}
                accessibilityRole="button"
                accessibilityLabel="Cancel workout"
              >
                <Text style={styles.finishSheetSecondaryText}>Cancel workout</Text>
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
            <Text style={styles.sheetTitle}>Cancel workout?</Text>
            <Text style={styles.muted}>
              This will abandon the session and discard the current workout.
            </Text>
            <View style={styles.finishSheetActions}>
              <Pressable
                onPress={() => setCancelConfirmVisible(false)}
                style={styles.finishSheetSecondary}
                accessibilityRole="button"
                accessibilityLabel="Keep working after cancel prompt"
              >
                <Text style={styles.finishSheetSecondaryText}>Keep working</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCancelConfirmVisible(false);
                  void onCancelWorkout();
                }}
                style={styles.finishSheetPrimaryDestructive}
                accessibilityRole="button"
                accessibilityLabel="Confirm cancel workout"
              >
                <Text style={styles.finishSheetPrimaryText}>Cancel workout</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={timerStubModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimerStubModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTimerStubModalVisible(false)}>
          <Pressable style={styles.confirmModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmModalTitle}>Timer coming next</Text>
            <Pressable
              onPress={() => setTimerStubModalVisible(false)}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.secondaryBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2F2F7" },
  headerTimerWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 36,
    marginBottom: 12,
  },
  headerTimer: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  topBarText: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  startScreenHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backBtn: { paddingVertical: 10, paddingRight: 16 },
  backBtnText: { fontSize: 17, fontWeight: "600", color: "#007AFF" },
  startCtaBlock: {
    marginTop: 100,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
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
  circleBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  finishBtn: {
    backgroundColor: "#FF3B30",
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
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  finishSheetPrimary: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  finishSheetPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  finishSheetPrimaryDestructive: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  finishSheetSecondary: {
    backgroundColor: "#F2F2F7",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  finishSheetSecondaryText: {
    color: "#1C1C1E",
    fontWeight: "700",
  },
  bottomRow: { flexDirection: "row", gap: 10 },
  bottomBtnPrimary: {
    flex: 1,
    backgroundColor: "#007AFF",
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
    backgroundColor: "#007AFF",
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
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  smallBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#007AFF",
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
    paddingHorizontal: 4,
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
    backgroundColor: "#007AFF",
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
    backgroundColor: "#007AFF",
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
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#E5E5EA",
    marginRight: 12,
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
  heroContainer: {
    position: "relative",
    width: "100%",
  },
  heroPressable: { position: "relative", width: "100%" },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  heroPlaceholder: {
    height: 160,
    width: "100%",
    backgroundColor: "#E5E5EA",
  },
  heroNameOverlay: {
    position: "absolute",
    left: 12,
    bottom: 12,
    right: 48,
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMenuBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 1,
  },
  heroMenuBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  loggerInlineContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  exerciseLoggerBackBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 0 },
  exerciseLoggerScroll: { flex: 1 },
  exerciseLoggerScrollContent: { padding: 16, paddingBottom: 32 },
  exerciseLoggerName: { fontSize: 22, fontWeight: "800", color: "#1C1C1E", marginBottom: 4 },
  exerciseLoggerBlockLabel: { fontSize: 13, color: "#6E6E73", marginBottom: 16 },
  setListInModal: { gap: 10, marginBottom: 16 },
  setRowInModal: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F2F2F7",
    borderRadius: 10,
    gap: 12,
  },
  setOrdinal: { fontSize: 15, fontWeight: "700", color: "#1C1C1E", width: 24 },
  setRowMiddle: { flex: 1, fontSize: 14, color: "#3C3C43" },
  setRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  donePill: { fontSize: 13, fontWeight: "600", color: "#34C759" },
  setOptionsInModal: { padding: 4 },
  draftInputsRow: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center" },
  draftInput: { flex: 0, width: 56, paddingVertical: 8, paddingHorizontal: 8, fontSize: 14 },
  draftInputSmall: { flex: 0, width: 40, paddingVertical: 8, paddingHorizontal: 6, fontSize: 14 },
  logDraftBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#007AFF", borderRadius: 8 },
  addSetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  addSetSmallBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E5E5EA",
  },
  addSetSmallBtnText: { fontSize: 14, fontWeight: "600", color: "#1C1C1E" },
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
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
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#1C1C1E", marginBottom: 12 },
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
    backgroundColor: "#007AFF",
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
