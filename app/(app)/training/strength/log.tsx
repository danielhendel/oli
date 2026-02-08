// app/(app)/training/strength/log.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { logStrengthWorkout } from "@/lib/api/usersMe";
import {
  buildManualStrengthWorkoutPayload,
  type ManualStrengthWorkoutPayload,
} from "@/lib/events/manualStrengthWorkout";
import { emitRefresh } from "@/lib/navigation/refreshBus";
import { ymdInTimeZoneFromIso } from "@/lib/time/dayKey";

const getDeviceTimeZone = (): string => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length ? tz : "UTC";
  } catch {
    return "UTC";
  }
};

function makeRefreshKey(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type SetDraft = {
  id: string;
  repsText: string;
  loadText: string;
  unit: "lb" | "kg";
  isWarmup?: boolean;
  rpeText?: string;
  rirText?: string;
  notes?: string;
};

type ExerciseDraft = {
  id: string;
  name: string;
  sets: SetDraft[];
};

const newSet = (): SetDraft => ({
  id: `set-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  repsText: "",
  loadText: "",
  unit: "lb",
});

const newExercise = (): ExerciseDraft => ({
  id: `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: "",
  sets: [newSet()],
});

function parseReps(s: string): number | null {
  const n = parseInt(s.trim(), 10);
  return Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : null;
}

function parseLoad(s: string): number | null {
  const n = parseFloat(s.trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRpeRir(s: string): number | null {
  const n = parseFloat(s.trim());
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null;
}

export default function StrengthLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string }>();
  const forcedDay =
    typeof params.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;

  const { user, initializing, getIdToken } = useAuth();

  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [timeZone] = useState(() => getDeviceTimeZone());
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() => [newExercise()]);
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "saving" }
    | { state: "error"; message: string }
    | { state: "saved"; rawEventId: string }
  >({ state: "idle" });

  // Reset startedAt to now when screen mounts (or user could have a "set to now" button)
  useEffect(() => {
    setStartedAt(new Date().toISOString());
  }, []);

  const { payload, valid, errors } = useMemo(() => {
    const errs: string[] = [];
    const built: ManualStrengthWorkoutPayload["exercises"] = [];

    for (let ei = 0; ei < exercises.length; ei++) {
      const ex = exercises[ei];
      if (!ex) continue;
      const name = ex.name.trim();
      if (!name) {
        if (ex.sets.some((set) => set.repsText.trim() || set.loadText.trim())) {
          errs.push(`Exercise ${ei + 1}: name required`);
        }
        continue;
      }

      const sets: ManualStrengthWorkoutPayload["exercises"][0]["sets"] = [];
      for (let si = 0; si < ex.sets.length; si++) {
        const s = ex.sets[si];
        if (!s) continue;
        const reps = parseReps(s.repsText);
        const load = parseLoad(s.loadText);

        if (s.repsText.trim() === "" && s.loadText.trim() === "") continue;

        if (reps === null) {
          errs.push(`${name} set ${si + 1}: reps must be a non-negative integer`);
        }
        if (load === null) {
          errs.push(`${name} set ${si + 1}: load must be a non-negative number`);
        }
        if (reps === null || load === null) continue;

        const rpe = s.rpeText?.trim() ? parseRpeRir(s.rpeText) : undefined;
        const rir = s.rirText?.trim() ? parseRpeRir(s.rirText) : undefined;

        if (s.rpeText?.trim() && s.rirText?.trim()) {
          errs.push(`${name} set ${si + 1}: use RPE or RIR, not both`);
        } else if (s.rpeText?.trim() && (rpe === null || rpe === undefined)) {
          errs.push(`${name} set ${si + 1}: RPE must be 0–10`);
        } else if (s.rirText?.trim() && (rir === null || rir === undefined)) {
          errs.push(`${name} set ${si + 1}: RIR must be 0–10`);
        }

        sets.push({
          reps,
          load,
          unit: s.unit,
          ...(s.isWarmup ? { isWarmup: true } : {}),
          ...(rpe !== undefined && rpe !== null ? { rpe } : {}),
          ...(rir !== undefined && rir !== null ? { rir } : {}),
          ...(s.notes?.trim() ? { notes: s.notes.trim().slice(0, 256) } : {}),
        });
      }

      if (sets.length === 0 && ex.sets.some((set) => set.repsText.trim() || set.loadText.trim())) {
        errs.push(`${name}: at least one valid set (reps + load) required`);
      } else if (sets.length > 0) {
        built.push({ name, sets });
      }
    }

    if (built.length === 0 && exercises.some((e) => e.name.trim() || e.sets.some((s) => s.repsText || s.loadText))) {
      if (errs.length === 0) errs.push("At least one exercise with valid sets required");
    }

    const valid = errs.length === 0 && built.length > 0;
    const payload: ManualStrengthWorkoutPayload | null = valid
      ? { startedAt, timeZone, exercises: built }
      : null;

    return { payload, valid, errors: errs };
  }, [exercises, startedAt, timeZone]);

  const canSave =
    !initializing &&
    Boolean(user) &&
    valid &&
    payload !== null &&
    status.state !== "saving";

  const onSave = async (): Promise<void> => {
    if (!canSave || !payload) return;
    setStatus({ state: "saving" });

    try {
      if (initializing) {
        setStatus({ state: "error", message: "Auth still initializing. Try again." });
        return;
      }
      if (!user) {
        setStatus({ state: "error", message: "Not signed in." });
        return;
      }

      const token = await getIdToken(false);
      if (!token) {
        setStatus({ state: "error", message: "No auth token (try Debug → Re-auth)" });
        return;
      }

      const built = buildManualStrengthWorkoutPayload(payload);
      const res = await logStrengthWorkout(built, token);

      if (!res.ok) {
        setStatus({
          state: "error",
          message: `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId ?? "n/a"})`,
        });
        return;
      }

      setStatus({ state: "saved", rawEventId: res.json.rawEventId });

      const refreshKey = makeRefreshKey();
      emitRefresh("commandCenter", refreshKey);

      const day = forcedDay ?? ymdInTimeZoneFromIso(payload.startedAt, payload.timeZone);
      router.replace({
        pathname: "/(app)/command-center",
        params: { day, refresh: refreshKey },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setStatus({ state: "error", message: msg });
    }
  };

  const addExercise = () => setExercises((prev) => [...prev, newExercise()]);
  const removeExercise = (id: string) =>
    setExercises((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const updateExercise = (id: string, patch: Partial<ExerciseDraft>) =>
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );

  const addSet = (exId: string) =>
    setExercises((prev) =>
      prev.map((e) => (e.id === exId ? { ...e, sets: [...e.sets, newSet()] } : e)),
    );

  const removeSet = (exId: string, setId: string) =>
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId && e.sets.length > 1
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e,
      ),
    );

  const updateSet = (exId: string, setId: string, patch: Partial<SetDraft>) =>
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );

  return (
    <ModuleScreenShell title="Log Strength" subtitle="Manual strength workout">
      <View style={styles.card}>
        <Text style={styles.label}>Started at</Text>
        <TextInput
          value={startedAt}
          onChangeText={setStartedAt}
          placeholder="ISO datetime"
          style={styles.input}
          accessibilityLabel="Workout start time"
        />

        {exercises.map((ex, exIdx) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <TextInput
                value={ex.name}
                onChangeText={(t) => updateExercise(ex.id, { name: t })}
                placeholder={`Exercise ${exIdx + 1} name`}
                style={[styles.input, styles.exerciseName]}
                accessibilityLabel={`Exercise ${exIdx + 1} name`}
              />
              <Pressable
                onPress={() => removeExercise(ex.id)}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove exercise ${exIdx + 1}`}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </Pressable>
            </View>

            {ex.sets.map((s, si) => (
              <View key={s.id} style={styles.setRow}>
                <TextInput
                  value={s.repsText}
                  onChangeText={(t) => updateSet(ex.id, s.id, { repsText: t })}
                  placeholder="Reps"
                  keyboardType="number-pad"
                  style={[styles.input, styles.setInput]}
                  accessibilityLabel={`Set ${si + 1} reps`}
                />
                <TextInput
                  value={s.loadText}
                  onChangeText={(t) => updateSet(ex.id, s.id, { loadText: t })}
                  placeholder="Load"
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.setInput]}
                  accessibilityLabel={`Set ${si + 1} load`}
                />
                <View style={styles.unitGroup}>
                  <Pressable
                    onPress={() => updateSet(ex.id, s.id, { unit: "lb" })}
                    style={[styles.unitButton, s.unit === "lb" && styles.unitActive]}
                  >
                    <Text style={[styles.unitText, s.unit === "lb" && styles.unitTextActive]}>lb</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateSet(ex.id, s.id, { unit: "kg" })}
                    style={[styles.unitButton, s.unit === "kg" && styles.unitActive]}
                  >
                    <Text style={[styles.unitText, s.unit === "kg" && styles.unitTextActive]}>kg</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => updateSet(ex.id, s.id, { isWarmup: !s.isWarmup })}
                  style={[styles.warmupBtn, s.isWarmup && styles.warmupActive]}
                  accessibilityLabel={`Set ${si + 1} warmup ${s.isWarmup ? "on" : "off"}`}
                >
                  <Text style={[styles.warmupText, s.isWarmup && styles.warmupTextActive]}>W</Text>
                </Pressable>
                <TextInput
                  value={s.rpeText ?? ""}
                  onChangeText={(t) => updateSet(ex.id, s.id, { rpeText: t, rirText: t ? "" : (s.rirText ?? "") })}
                  placeholder="RPE"
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.optInput]}
                  accessibilityLabel={`Set ${si + 1} RPE`}
                />
                <TextInput
                  value={s.rirText ?? ""}
                  onChangeText={(t) => updateSet(ex.id, s.id, { rirText: t, rpeText: t ? "" : (s.rpeText ?? "") })}
                  placeholder="RIR"
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.optInput]}
                  accessibilityLabel={`Set ${si + 1} RIR`}
                />
                <Pressable
                  onPress={() => removeSet(ex.id, s.id)}
                  style={styles.removeSetBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeBtnText}>−</Text>
                </Pressable>
              </View>
            ))}
            <Pressable onPress={() => addSet(ex.id)} style={styles.addSetBtn}>
              <Text style={styles.addSetText}>+ Add set</Text>
            </Pressable>
          </View>
        ))}

        <Pressable onPress={addExercise} style={styles.addExBtn}>
          <Text style={styles.addExText}>+ Add exercise</Text>
        </Pressable>

        {errors.length > 0 ? (
          <View style={styles.errorBlock}>
            {errors.map((err, i) => (
              <Text key={i} style={styles.helperError}>
                {err}
              </Text>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => void onSave()}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save workout"
          style={({ pressed }) => [
            styles.saveButton,
            !canSave && styles.saveDisabled,
            pressed && canSave && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.saveText}>{status.state === "saving" ? "Saving…" : "Save"}</Text>
        </Pressable>

        {status.state === "error" ? <Text style={styles.helperError}>{status.message}</Text> : null}
        {status.state === "saved" ? (
          <Text style={styles.helperSuccess}>Saved (rawEventId: {status.rawEventId})</Text>
        ) : null}

        <Text style={styles.helperNote}>
          Daily facts may take a moment to update while the pipeline processes your raw event.
        </Text>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#F2F2F7", borderRadius: 16, padding: 14, gap: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#111827" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  exerciseCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 8 },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  exerciseName: { flex: 1 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  setInput: { width: 56, paddingHorizontal: 8 },
  optInput: { width: 48, paddingHorizontal: 8 },
  unitGroup: {
    flexDirection: "row",
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
    overflow: "hidden",
  },
  unitButton: { paddingHorizontal: 10, paddingVertical: 10 },
  unitActive: { backgroundColor: "#111827" },
  unitText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  unitTextActive: { color: "#FFFFFF" },
  warmupBtn: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "#F2F2F7", borderRadius: 8 },
  warmupActive: { backgroundColor: "#111827" },
  warmupText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  warmupTextActive: { color: "#FFFFFF" },
  addSetBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  addSetText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  addExBtn: { paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, borderStyle: "dashed" },
  addExText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  removeBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  removeBtnText: { fontSize: 12, fontWeight: "600", color: "#B00020" },
  removeSetBtn: { padding: 8 },
  saveButton: {
    marginTop: 10,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveDisabled: { opacity: 0.35 },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  helperError: { color: "#B00020", fontSize: 12, fontWeight: "600" },
  helperSuccess: { color: "#1B5E20", fontSize: 12, fontWeight: "700" },
  helperNote: { marginTop: 8, color: "#6B7280", fontSize: 12, fontWeight: "600" },
  errorBlock: { gap: 4 },
});
