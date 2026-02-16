// app/(app)/workout/log/manual.tsx
import React, { useEffect, useState } from "react";
import { Platform, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import { Text } from "@/lib/ui/Text";
import Card from "@/lib/ui/Card";
import Button from "@/lib/ui/Button";
import FormRow from "@/components/forms/FormRow";
import NumberInput from "@/components/forms/NumberInput";
import DetailHeader from "@/components/layout/DetailHeader";

import { saveLog } from "@/lib/logging/saveLog";
import { useAuth } from "@/lib/auth/AuthContext";
import { toYMD } from "@/lib/util/date";
import { decodePrefill } from "@/lib/logging/prefill";
import { emit } from "@/lib/ui/eventBus";

// --- Types kept narrow and UI-focused (no Firestore types here) ---
type WorkoutSet = { reps?: number; weight?: number; rpe?: number };
type WorkoutExercise = { name?: string; sets?: WorkoutSet[] };
type WorkoutDraft = { durationMs?: number; exercises?: WorkoutExercise[] };

export default function WorkoutManual() {
  const { ymd, prefill } = useLocalSearchParams<{ ymd?: string; prefill?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const chosenDay = typeof ymd === "string" && ymd ? ymd : toYMD(new Date());

  const [durationMin, setDurationMin] = useState<number>(45);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    { name: "Squat", sets: [{ reps: 5, weight: 100 }] },
  ]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Prefill from Templates/Past (if provided)
  useEffect(() => {
    const p = decodePrefill<WorkoutDraft>(prefill);
    if (!p) return;
    if (typeof p.durationMs === "number") setDurationMin(Math.round(p.durationMs / 60000));
    if (Array.isArray(p.exercises)) setExercises(p.exercises);
  }, [prefill]);

  function onBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      const href = { pathname: "/workout", params: { focusYmd: chosenDay } } satisfies Href;
      router.replace(href);
    }
  }

  async function onSave() {
    if (!user?.uid) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await saveLog(
        "workout",
        { exercises, durationMs: durationMin * 60_000 },
        user.uid,
        { ymd: chosenDay },
      );
      if (!res.ok) {
        const first = Array.isArray(res.issues) ? res.issues[0] : undefined;
        throw new Error((first?.message as string) || "Save failed");
      }

      // Optimistic signal so Day screen can refresh immediately
      emit("log:saved", { type: "workout", ymd: chosenDay });

      const href = { pathname: "/(app)/workout/day/[ymd]", params: { ymd: chosenDay } } satisfies Href;
      router.replace(href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  // --- UI helpers with strict TS guards (no unsafe indexed access) ---
  function addExercise() {
    setExercises((arr) => [...arr, { name: "Exercise", sets: [{ reps: 10 }] }]);
  }

  function removeExercise(idx: number) {
    setExercises((arr) => arr.filter((_, i) => i !== idx));
  }

  function addSet(exIdx: number) {
    setExercises((arr) => {
      const next = [...arr];
      const existing: WorkoutExercise = next[exIdx] ?? {
        name: `Exercise ${exIdx + 1}`,
        sets: [] as WorkoutSet[],
      };
      const sets = existing.sets ?? [];
      const updated: WorkoutExercise = { ...existing, sets: [...sets, { reps: 10 }] };
      next[exIdx] = updated;
      return next;
    });
  }

  function setSetField(exIdx: number, setIdx: number, key: keyof WorkoutSet, value?: number) {
    setExercises((arr) => {
      const next = [...arr];
      const existing: WorkoutExercise = next[exIdx] ?? {
        name: `Exercise ${exIdx + 1}`,
        sets: [] as WorkoutSet[],
      };
      const sets = [...(existing.sets ?? [])];
      const currentSet: WorkoutSet = sets[setIdx] ?? {};
      sets[setIdx] = { ...currentSet, [key]: value };
      next[exIdx] = { ...existing, sets };
      return next;
    });
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <DetailHeader title="New Workout" onBack={onBack} />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {err ? (
            <Card variant="elevated" padding="md" radius="xl">
              <Text tone="danger">{err}</Text>
            </Card>
          ) : null}

          <Card variant="elevated" padding="lg" radius="xl">
            <Text weight="bold">Details</Text>
            <View style={{ height: 12 }} />

            <FormRow label="Duration (minutes)">
              <NumberInput
                value={durationMin}
                min={0}
                onChange={(n) => setDurationMin(n ?? 0)}
                placeholder="e.g. 45"
              />
            </FormRow>

            <View style={{ height: 8 }} />
            <Text weight="medium">Exercises</Text>
            <View style={{ height: 8 }} />

            {exercises.map((ex, exIdx) => (
              <Card key={exIdx} variant="outline" padding="md" radius="xl" style={{ gap: 8 }}>
                <Text weight="medium">{ex.name || `Exercise ${exIdx + 1}`}</Text>

                {(ex.sets ?? []).map((s, setIdx) => (
                  <Card key={`${exIdx}-${setIdx}`} variant="elevated" radius="lg" padding="md">
                    <Text weight="medium">Set {setIdx + 1}</Text>
                    <View style={{ height: 8 }} />
                    <NumberInput
                      value={s.reps}
                      min={0}
                      placeholder="Reps"
                      onChange={(n) => setSetField(exIdx, setIdx, "reps", n)}
                    />
                    <View style={{ height: 8 }} />
                    <NumberInput
                      value={s.weight}
                      min={0}
                      placeholder="Weight (kg)"
                      onChange={(n) => setSetField(exIdx, setIdx, "weight", n)}
                    />
                    <View style={{ height: 8 }} />
                    <NumberInput
                      value={s.rpe}
                      min={1}
                      max={10}
                      placeholder="RPE (1–10)"
                      onChange={(n) => setSetField(exIdx, setIdx, "rpe", n)}
                    />
                  </Card>
                ))}

                <Button variant="secondary" label="Add Set" onPress={() => addSet(exIdx)} />
                <Button variant="ghost" label="Remove Exercise" onPress={() => removeExercise(exIdx)} />
              </Card>
            ))}

            <Button variant="secondary" label="Add Exercise" onPress={addExercise} />
          </Card>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label={saving ? "Saving…" : "Save"} onPress={onSave} disabled={saving} />
            <Button variant="ghost" label="Cancel" onPress={onBack} disabled={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
