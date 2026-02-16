// app/(app)/workout/log/[id].tsx
import React from "react";
import { View, ScrollView, Alert, BackHandler } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthContext";
import { readEventById } from "@/lib/logging/readOne";
import { updateWorkoutEvent, deleteEventById } from "@/lib/logging/mutateEvent";
import type { EventDoc } from "@/lib/logging/types";
import { createTemplate } from "@/lib/logging/templates";
import Card from "@/lib/ui/Card";
import { Text } from "@/lib/ui/Text";
import Button from "@/lib/ui/Button";
import DetailHeader from "@/components/layout/DetailHeader";
import NumberInput from "@/components/forms/NumberInput";
import ActionBar from "@/components/layout/ActionBar";
import WorkoutHero from "@/components/workout/WorkoutHero";
import WorkoutExerciseList, {
  WorkoutExercise,
  WorkoutSet,
} from "@/components/workout/WorkoutExerciseList";
import { deriveWorkoutStats } from "@/lib/logging/workoutStats";
import { toYMD } from "@/lib/util/date";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
const getNum = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

export default function WorkoutLogDetail() {
  const { id, ymd: ymdParam } = useLocalSearchParams<{ id: string; ymd?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [doc, setDoc] = React.useState<EventDoc | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [exercises, setExercises] = React.useState<WorkoutExercise[]>([]);

  React.useEffect(() => {
    let live = true;
    (async () => {
      if (!user?.uid || !id) return;
      try {
        const d = await readEventById(user.uid, id);
        if (!live) return;
        setDoc(d);
        if (d?.type === "workout") {
          setExercises(coerceWorkoutPayload(d.payload).exercises);
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [user?.uid, id]);

  // Memoized day focus (fixes exhaustive-deps)
  const focusYmd = React.useMemo(() => {
    if (typeof ymdParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ymdParam)) return ymdParam;
    const fromDoc = (doc && (doc as unknown as { ymd?: string }).ymd) || undefined;
    return fromDoc ?? toYMD(new Date());
  }, [ymdParam, doc]);

  const onBackToDay = React.useCallback(() => {
    router.replace({ pathname: "/workout/day/[ymd]", params: { ymd: focusYmd } });
  }, [router, focusYmd]);

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        onBackToDay();
        return true;
      });
      return () => sub.remove();
    }, [onBackToDay])
  );

  const title = "Workout";

  function coerceWorkoutPayload(u: unknown): { exercises: WorkoutExercise[] } {
    const out: WorkoutExercise[] = [];
    if (isObj(u)) {
      type WithExercises = { exercises?: unknown };
      const xs = Array.isArray((u as WithExercises).exercises)
        ? ((u as WithExercises).exercises as unknown[])
        : [];
      for (const item of xs) {
        if (!isObj(item)) continue;
        const rawName = (item as Record<string, unknown>).name;
        const name: string = typeof rawName === "string" ? rawName : "Exercise";

        const setsRaw = Array.isArray((item as Record<string, unknown>).sets)
          ? ((item as Record<string, unknown>).sets as unknown[])
          : [];
        const sets: WorkoutSet[] = setsRaw.map((s: unknown) => {
          const r: WorkoutSet = {};
          if (isObj(s)) {
            const sr = s as Record<string, unknown>;
            const reps = getNum(sr.reps);
            const weight = getNum(sr.weight);
            const rpe = getNum(sr.rpe);
            if (reps !== undefined) r.reps = reps;
            if (weight !== undefined) r.weight = weight;
            if (rpe !== undefined) r.rpe = rpe;
          }
          return r;
        });
        out.push({ name, sets });
      }
    }
    return { exercises: out };
  }

  function setSetField(exIdx: number, setIdx: number, field: keyof WorkoutSet, val?: number) {
    setExercises((prev) => {
      const next = prev.slice();
      const ex = next[exIdx];
      if (!ex) return prev;
      const sets = ex.sets.slice();
      const curr: WorkoutSet = { ...(sets[setIdx] ?? {}) };
      if (field === "reps") {
        if (val === undefined) delete curr.reps;
        else curr.reps = val;
      } else if (field === "weight") {
        if (val === undefined) delete curr.weight;
        else curr.weight = val;
      } else if (field === "rpe") {
        if (val === undefined) delete curr.rpe;
        else curr.rpe = val;
      }
      sets[setIdx] = curr;
      next[exIdx] = { name: ex.name, sets };
      return next;
    });
  }

  function addExercise() {
    setExercises((prev) => [...prev, { name: `Exercise ${prev.length + 1}`, sets: [] }]);
  }
  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_ex: WorkoutExercise, i: number) => i !== idx));
  }
  function addSet(exIdx: number) {
    setExercises((prev) => {
      const next = prev.slice();
      const ex = next[exIdx];
      if (!ex) return prev;
      next[exIdx] = { name: ex.name, sets: [...ex.sets, {}] };
      return next;
    });
  }
  function removeSet(exIdx: number, setIdx: number) {
    setExercises((prev) => {
      const next = prev.slice();
      const ex = next[exIdx];
      if (!ex) return prev;
      next[exIdx] = {
        name: ex.name,
        sets: ex.sets.filter((_s: WorkoutSet, i: number) => i !== setIdx),
      };
      return next;
    });
  }

  async function save() {
    if (!user?.uid || !id) return;
    const normalized = exercises.map((ex, i) => ({
      name: ex.name?.trim() || `Exercise ${i + 1}`,
      sets: (Array.isArray(ex.sets) ? ex.sets : []).map((s: WorkoutSet) => {
        const out: WorkoutSet = {};
        if (typeof s.reps === "number") out.reps = s.reps;
        if (typeof s.weight === "number") out.weight = s.weight;
        if (typeof s.rpe === "number") out.rpe = s.rpe;
        return out;
      }),
    }));
    await updateWorkoutEvent(user.uid, id, { exercises: normalized });
    setEditing(false);
    const fresh = await readEventById(user.uid, id);
    setDoc(fresh);
  }

  async function onSaveAsTemplate() {
    if (!user?.uid || !doc || doc.type !== "workout") return;
    const payload = { exercises };
    const first = payload.exercises[0]?.name?.trim();
    const name = first
      ? `${first} (${payload.exercises.length} set${payload.exercises.length === 1 ? "" : "s"})`
      : "Workout";
    try {
      await createTemplate(user.uid, "workout", name, payload);
      Alert.alert("Saved", "Added to Workout Templates.");
    } catch (e) {
      Alert.alert("Couldn’t save template", e instanceof Error ? e.message : String(e));
    }
  }

  function confirmDelete() {
    if (!user?.uid || !id) return;
    Alert.alert("Delete log?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEventById(user.uid!, id);
          onBackToDay();
        },
      },
    ]);
  }

  const ymd = focusYmd;
  const stats = deriveWorkoutStats(doc?.payload);

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F5F7" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader title={title} onBack={onBackToDay} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {error ? (
          <Card variant="elevated" radius="lg" padding="lg">
            <Text tone="danger">{error}</Text>
          </Card>
        ) : null}

        <WorkoutHero
          title={title}
          ymd={ymd}
          totalSets={stats.totalSets}
          {...(typeof stats.totalVolumeKg === "number" ? { totalVolumeKg: stats.totalVolumeKg } : {})}
        />

        {!editing ? (
          <View style={{ marginTop: 12 }}>
            <WorkoutExerciseList exercises={Array.isArray(exercises) ? exercises : []} />
          </View>
        ) : (
          <Card variant="elevated" radius="lg" padding="lg" style={{ gap: 12, marginTop: 12 }}>
            <Text size="lg" weight="medium">Edit Workout</Text>
            <View style={{ gap: 16 }}>
              {exercises.map((ex, exIdx) => (
                <Card key={exIdx} variant="outline" radius="lg" padding="md" style={{ gap: 10 }}>
                  <Text weight="medium">{ex.name || `Exercise ${exIdx + 1}`}</Text>
                  <View style={{ gap: 10 }}>
                    {ex.sets.map((s: WorkoutSet, setIdx: number) => (
                      <Card key={`${exIdx}-${setIdx}`} variant="elevated" radius="lg" padding="md">
                        <Text weight="medium">Set {setIdx + 1}</Text>
                        <View style={{ height: 8 }} />
                        <NumberInput
                          value={s.reps}
                          min={0}
                          placeholder="Reps"
                          onChange={(n?: number) => setSetField(exIdx, setIdx, "reps", n)}
                        />
                        <View style={{ height: 8 }} />
                        <NumberInput
                          value={s.weight}
                          min={0}
                          placeholder="Weight (kg)"
                          onChange={(n?: number) => setSetField(exIdx, setIdx, "weight", n)}
                        />
                        <View style={{ height: 8 }} />
                        <NumberInput
                          value={s.rpe}
                          min={1}
                          max={10}
                          placeholder="RPE (1–10)"
                          onChange={(n?: number) => setSetField(exIdx, setIdx, "rpe", n)}
                        />
                        <View style={{ height: 10 }} />
                        <Button variant="ghost" label="Remove Set" onPress={() => removeSet(exIdx, setIdx)} />
                      </Card>
                    ))}
                    <Button variant="secondary" label="Add Set" onPress={() => addSet(exIdx)} />
                  </View>
                  <Button variant="ghost" label="Remove Exercise" onPress={() => removeExercise(exIdx)} />
                </Card>
              ))}
              <Button variant="secondary" label="Add Exercise" onPress={addExercise} />
            </View>
          </Card>
        )}
      </ScrollView>

      <ActionBar
        left={[]}
        right={
          !editing
            ? [
                { label: "Save as Template", onPress: onSaveAsTemplate },
                { label: "Edit", onPress: () => setEditing(true) },
                { label: "Delete", onPress: confirmDelete, variant: "ghost" },
              ]
            : [
                { label: "Save", onPress: save, variant: "primary" },
                { label: "Cancel", onPress: () => setEditing(false), variant: "ghost" },
              ]
        }
      />
    </View>
  );
}
