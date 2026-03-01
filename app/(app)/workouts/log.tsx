import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";
import { EXERCISE_CATALOG_V1 } from "@/lib/workouts/exercises/catalog";
import { searchExercises } from "@/lib/workouts/exercises/search";
import { buildExerciseMemory, type ExerciseMemoryMap } from "@/lib/workouts/memory/exerciseMemory";
import {
  addExercise,
  completeSession,
  createSessionDraft,
  logStrengthSet,
  startSession,
} from "@/lib/workouts/sessionEngine/commands";
import { loadReducedSession } from "@/lib/workouts/sessionEngine/selectors";
import {
  clearActiveWorkoutSessionId,
  getActiveWorkoutSessionId,
  setActiveWorkoutSessionId,
} from "@/lib/workouts/sessionEngine/activeSessionStorage";

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

export default function WorkoutLogScreen() {
  const { user, initializing } = useAuth();

  type UiState =
    | { status: "idle" }
    | { status: "starting" }
    | { status: "active"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "completed"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "error"; message: string };

  const [ui, setUi] = useState<UiState>({ status: "idle" });
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { repsText: string; loadText: string }>>({});
  const [memory, setMemory] = useState<ExerciseMemoryMap>({});

  const isSignedIn = Boolean(user) && !initializing;

  const reduced = ui.status === "active" || ui.status === "completed" ? ui.reduced : null;
  const sessionId = ui.status === "active" || ui.status === "completed" ? ui.sessionId : null;

  const canInteract = isSignedIn && ui.status !== "starting";

  const sanitizeExerciseId = (name: string): string | null => {
    const s = name.trim().toLowerCase();
    if (!s) return null;
    // Deterministic slug: letters/numbers/_ only; spaces and dashes -> underscore; collapse repeats.
    const slug = s
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!slug) return null;
    if (slug.length > 64) return slug.slice(0, 64);
    return slug;
  };

  const exerciseResults = useMemo(
    () => searchExercises(EXERCISE_CATALOG_V1, exerciseQuery, 8),
    [exerciseQuery],
  );
  const customExerciseId = useMemo(() => sanitizeExerciseId(exerciseQuery), [exerciseQuery]);

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
    async (exerciseId: string) => {
      if (!user || !sessionId) return;
      try {
        const pos = reduced?.exercises ? reduced.exercises.filter((e) => !e.removed).length : 0;
        await addExercise(user.uid, sessionId, { exerciseId, position: pos });
        setExerciseQuery("");
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, reduced?.exercises, refreshReduced],
  );

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

  const onLogSet = useCallback(
    async (slotId: string) => {
      if (!user || !sessionId || !reduced) return;
      const d = drafts[slotId] ?? { repsText: "", loadText: "" };
      const reps = parsePositiveInt(d.repsText);
      const loadLb = parsePositiveFloat(d.loadText);
      if (reps == null || loadLb == null) {
        setUi({ status: "error", message: "Set requires reps (int) and load (lb), both > 0." });
        return;
      }
      const loadKg = loadLb * KG_PER_LB;

      const ex = reduced.exercises.find((e) => e.slotId === slotId) ?? null;
      if (!ex || ex.removed) {
        setUi({ status: "error", message: "Exercise slot not found." });
        return;
      }
      const nextOrdinal = ex.sets.length + 1;

      try {
        await logStrengthSet(user.uid, sessionId, {
          slotId,
          ordinal: nextOrdinal,
          reps,
          loadKg,
        });
        setDrafts((prev) => ({ ...prev, [slotId]: { repsText: "", loadText: "" } }));
        await refreshReduced(user.uid, sessionId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setUi({ status: "error", message: msg });
      }
    },
    [user, sessionId, reduced, drafts, refreshReduced],
  );

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

  useEffect(() => {
    if (!user || initializing) return;
    buildExerciseMemory(user.uid)
      .then(setMemory)
      .catch(() => setMemory({}));
  }, [user, initializing]);

  const title = ui.status === "active" ? "Log Workout" : ui.status === "completed" ? "Workout Complete" : "Log Workout";
  const subtitle =
    ui.status === "active"
      ? "Session in progress"
      : ui.status === "completed"
        ? "Session sealed (offline journal)"
        : "Manual workout entry (offline)";

  const visibleExercises = useMemo(() => {
    if (!reduced) return [];
    return reduced.exercises.filter((e) => !e.removed);
  }, [reduced]);

  return (
    <ModuleScreenShell title={title} subtitle={subtitle}>
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
        <View style={styles.card}>
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
          <View style={styles.card}>
            <Text style={styles.title}>Exercises</Text>
            <TextInput
              value={exerciseQuery}
              onChangeText={setExerciseQuery}
              placeholder="Search exercises (e.g. bench, squat, ohp)"
              style={styles.input}
              accessibilityLabel="Exercise search"
            />
            {exerciseQuery.trim() !== "" ? (
              <View style={styles.resultsCard}>
                {exerciseResults.map((e) => (
                  <Pressable
                    key={e.exerciseId}
                    onPress={() => void onPickExercise(e.exerciseId)}
                    style={styles.resultRow}
                    accessibilityRole="button"
                    accessibilityLabel={`Pick ${e.name}`}
                  >
                    <Text style={styles.resultTitle}>{e.name}</Text>
                    <Text style={styles.resultMeta}>{e.exerciseId}</Text>
                  </Pressable>
                ))}
                {exerciseResults.length === 0 && customExerciseId ? (
                  <Pressable
                    onPress={() => void onPickExercise(customExerciseId)}
                    style={styles.resultRow}
                    accessibilityRole="button"
                    accessibilityLabel={`Add custom ${customExerciseId}`}
                  >
                    <Text style={styles.resultTitle}>Add custom {customExerciseId}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.mutedSmall}>Session ID: {sessionId}</Text>
          </View>

          {visibleExercises.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>No exercises yet. Add one above.</Text>
            </View>
          ) : null}

          {visibleExercises.map((ex) => {
            const d = drafts[ex.slotId] ?? { repsText: "", loadText: "" };
            const mem = memory[ex.exerciseId];
            const lastStr =
              mem?.last != null
                ? `${mem.last.reps} × ${(mem.last.loadKg * LB_PER_KG).toFixed(1)} lb`
                : "—";
            const bestStr =
              mem?.best != null
                ? `${mem.best.reps} × ${(mem.best.loadKg * LB_PER_KG).toFixed(1)} lb`
                : "—";
            const showMemory = mem?.last != null || mem?.best != null;
            return (
              <View key={ex.slotId} style={styles.exerciseCard} accessibilityLabel={`exercise:${ex.exerciseId}`}>
                <Text style={styles.exerciseTitle}>{ex.exerciseId}</Text>
                {showMemory ? (
                  <Text style={styles.mutedSmall}>
                    Last: {lastStr}   Best: {bestStr}
                  </Text>
                ) : null}
                {ex.sets.length > 0 ? (
                  <View style={styles.setList}>
                    {ex.sets.map((s) => (
                      <Text key={s.setId} style={styles.setRow}>
                        Set {s.ordinal}: {s.reps} reps ·{" "}
                        {s.loadKg != null ? (s.loadKg * LB_PER_KG).toFixed(1) : "—"} lb
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.mutedSmall}>No sets logged yet.</Text>
                )}

                <View style={styles.row}>
                  <TextInput
                    value={d.repsText}
                    onChangeText={(t) => setDrafts((prev) => ({ ...prev, [ex.slotId]: { ...d, repsText: t } }))}
                    placeholder="Reps"
                    keyboardType="number-pad"
                    style={[styles.input, styles.inputSmall]}
                    accessibilityLabel={`Reps input ${ex.exerciseId}`}
                  />
                  <TextInput
                    value={d.loadText}
                    onChangeText={(t) => setDrafts((prev) => ({ ...prev, [ex.slotId]: { ...d, loadText: t } }))}
                    placeholder="Load (lb)"
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.inputSmall]}
                    accessibilityLabel={`Load input ${ex.exerciseId}`}
                  />
                  <Pressable
                    onPress={() => void onLogSet(ex.slotId)}
                    style={styles.smallBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Add set ${ex.exerciseId}`}
                  >
                    <Text style={styles.smallBtnText}>+ Set</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          <View style={styles.card}>
            <Pressable
              onPress={onFinish}
              style={styles.primaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Finish workout"
            >
              <Text style={styles.primaryBtnText}>Finish workout</Text>
            </Pressable>
            <Text style={styles.mutedSmall}>
              Completing seals the session (future edits should be append-only corrections).
            </Text>
          </View>
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
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
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
  setList: { gap: 4 },
  setRow: { fontSize: 13, color: "#3C3C43" },
  resultsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 0,
    maxHeight: 280,
  },
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  resultTitle: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  resultMeta: { fontSize: 12, color: "#6E6E73", fontFamily: "monospace", marginTop: 2 },
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
