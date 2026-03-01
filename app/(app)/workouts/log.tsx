import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ReducedSessionV1 } from "@/lib/workouts/journal/types";
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

export default function WorkoutLogScreen() {
  const { user, initializing } = useAuth();

  type UiState =
    | { status: "idle" }
    | { status: "starting" }
    | { status: "active"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "completed"; sessionId: string; reduced: ReducedSessionV1 }
    | { status: "error"; message: string };

  const [ui, setUi] = useState<UiState>({ status: "idle" });
  const [exerciseName, setExerciseName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { repsText: string; loadText: string }>>({});

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

  const onAddExercise = useCallback(async () => {
    if (!user || !sessionId) return;
    const exId = sanitizeExerciseId(exerciseName);
    if (!exId) {
      setUi({ status: "error", message: "Exercise name required (letters/numbers only)." });
      return;
    }
    try {
      const pos = reduced?.exercises ? reduced.exercises.filter((e) => !e.removed).length : 0;
      await addExercise(user.uid, sessionId, { exerciseId: exId, position: pos });
      setExerciseName("");
      await refreshReduced(user.uid, sessionId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setUi({ status: "error", message: msg });
    }
  }, [user, sessionId, exerciseName, reduced?.exercises, refreshReduced]);

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
      const loadKg = parsePositiveFloat(d.loadText);
      if (reps == null || loadKg == null) {
        setUi({ status: "error", message: "Set requires reps (int) and loadKg (number), both > 0." });
        return;
      }

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
            <View style={styles.row}>
              <TextInput
                value={exerciseName}
                onChangeText={setExerciseName}
                placeholder="Add exercise (e.g. bench press)"
                style={styles.input}
                accessibilityLabel="Exercise name"
              />
              <Pressable
                onPress={onAddExercise}
                disabled={!exerciseName.trim()}
                style={[styles.smallBtn, !exerciseName.trim() && styles.primaryBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Add exercise"
              >
                <Text style={styles.smallBtnText}>Add</Text>
              </Pressable>
            </View>
            <Text style={styles.mutedSmall}>Session ID: {sessionId}</Text>
          </View>

          {visibleExercises.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>No exercises yet. Add one above.</Text>
            </View>
          ) : null}

          {visibleExercises.map((ex) => {
            const d = drafts[ex.slotId] ?? { repsText: "", loadText: "" };
            return (
              <View key={ex.slotId} style={styles.exerciseCard} accessibilityLabel={`exercise:${ex.exerciseId}`}>
                <Text style={styles.exerciseTitle}>{ex.exerciseId}</Text>
                {ex.sets.length > 0 ? (
                  <View style={styles.setList}>
                    {ex.sets.map((s) => (
                      <Text key={s.setId} style={styles.setRow}>
                        Set {s.ordinal}: {s.reps} reps · {s.loadKg ?? "—"} kg
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
                    placeholder="Load (kg)"
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
