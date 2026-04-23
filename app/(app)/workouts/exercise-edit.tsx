import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { isUserScopedCustomExerciseId } from "@oli/contracts";
import type { ExerciseDefinitionUpdateBody } from "@oli/contracts";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Equipment, MuscleGroupDetailed, PrimaryBucket } from "@/lib/workouts/exercises/taxonomy";
import {
  isMuscleSubgroup,
  validateMuscleContributions,
  type MuscleContribution,
} from "@/lib/workouts/exercises/taxonomy";
import type { MovementPattern } from "@/lib/workouts/exercises/metadata";
import { updateExerciseDefinition } from "@/lib/api/exerciseDefinitions";
import {
  updateCustomExercise,
  type CustomExerciseLoggingType,
  type CustomExerciseRecord,
  type CustomExerciseUpdatePatch,
} from "@/lib/workouts/exercises/customExerciseStore";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

const EQUIPMENT_OPTIONS: Equipment[] = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Kettlebell",
  "Other",
];

const PRIMARY_OPTIONS: (PrimaryBucket | "Other")[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Core",
  "Full body",
  "Other",
];

const LOGGING_TYPE_OPTIONS: { value: CustomExerciseLoggingType; label: string }[] = [
  { value: "weight_reps", label: "Weight + reps" },
  { value: "reps_only", label: "Reps only" },
  { value: "bodyweight_reps", label: "Bodyweight reps" },
];

const MOVEMENT_OPTIONS: { value: MovementPattern; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "squat", label: "Squat" },
  { value: "hinge", label: "Hinge" },
  { value: "carry", label: "Carry" },
  { value: "core", label: "Core" },
  { value: "isolation", label: "Isolation" },
  { value: "lunge", label: "Lunge" },
  { value: "rotation", label: "Rotation" },
  { value: "gait", label: "Gait" },
];

function trimCollapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function EditExerciseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    exerciseId?: string;
    sessionId?: string;
    blockId?: string;
    logReturnPath?: string;
    enrichDay?: string;
    enrichTargetId?: string;
    sessionAnchorIso?: string;
    journalSessionId?: string;
  }>();
  const { user, initializing, getIdToken } = useAuth();

  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId.trim() : "";
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : undefined;
  const blockId = typeof params.blockId === "string" ? params.blockId : undefined;
  const returnToEnrich = params.logReturnPath === "enrich";

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("task"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "notfound" | "forbidden">("loading");
  const [name, setName] = useState("");
  const [aliasesText, setAliasesText] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("Machine");
  const [primary, setPrimary] = useState<PrimaryBucket | "Other">("Full body");
  const [loggingType, setLoggingType] = useState<CustomExerciseLoggingType>("weight_reps");
  const [movementPattern, setMovementPattern] = useState<MovementPattern>("isolation");
  const [primaryMusclesText, setPrimaryMusclesText] = useState("");
  const [secondaryMusclesText, setSecondaryMusclesText] = useState("");
  const [muscleContributionsJson, setMuscleContributionsJson] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || initializing) return;
    if (exerciseId.length === 0) {
      setLoadStatus("notfound");
      return;
    }
    if (!isUserScopedCustomExerciseId(user.uid, exerciseId)) {
      setLoadStatus("forbidden");
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    void listMergedCustomExerciseRecords(user.uid, () => getIdToken(false))
      .then((rows: CustomExerciseRecord[]) => {
        if (cancelled) return;
        const row = rows.find((r: CustomExerciseRecord) => r.exerciseId === exerciseId);
        if (row == null) {
          setLoadStatus("notfound");
          return;
        }
        setName(row.name);
        setAliasesText(row.aliases != null ? row.aliases.join(", ") : "");
        setEquipment(row.equipment);
        setPrimary(row.primary);
        setLoggingType(row.loggingType);
        setMovementPattern(row.movementPattern ?? "isolation");
        setPrimaryMusclesText(row.primaryMusclesDetailed != null ? row.primaryMusclesDetailed.join(", ") : "");
        setSecondaryMusclesText(
          row.secondaryMusclesDetailed != null ? row.secondaryMusclesDetailed.join(", ") : "",
        );
        setMuscleContributionsJson(
          row.muscleContributions != null ? JSON.stringify(row.muscleContributions, null, 2) : "",
        );
        setImageUrl(row.imageUrl ?? "");
        setVideoUrl(row.videoUrl ?? "");
        setMediaUrl(row.mediaUrl ?? "");
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("notfound");
      });
    return () => {
      cancelled = true;
    };
  }, [user, initializing, exerciseId, getIdToken]);

  const canSave = useMemo(() => {
    if (loadStatus !== "ready") return false;
    if (saveStatus === "saving") return false;
    if (!user || initializing) return false;
    return trimCollapse(name).length > 0;
  }, [loadStatus, saveStatus, user, initializing, name]);

  const navigateAfterSave = useCallback(() => {
    if (sessionId == null) {
      router.back();
      return;
    }
    const pathname = returnToEnrich ? "/(app)/workouts/enrich" : "/(app)/workouts/log";
    const nextParams: Record<string, string> = {
      sessionId,
      pickedExerciseId: exerciseId,
    };
    if (blockId) nextParams.blockId = blockId;
    if (returnToEnrich) {
      const d = typeof params.enrichDay === "string" ? params.enrichDay : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) nextParams.enrichDay = d;
      const t = typeof params.enrichTargetId === "string" ? params.enrichTargetId.trim() : "";
      if (t.length > 0) nextParams.enrichTargetId = t;
      const a = typeof params.sessionAnchorIso === "string" ? params.sessionAnchorIso.trim() : "";
      if (a.length > 0) nextParams.sessionAnchorIso = a;
      const j = typeof params.journalSessionId === "string" ? params.journalSessionId.trim() : "";
      if (j.length > 0) nextParams.journalSessionId = j;
    }
    router.replace({ pathname, params: nextParams });
  }, [
    router,
    sessionId,
    blockId,
    returnToEnrich,
    exerciseId,
    params.enrichDay,
    params.enrichTargetId,
    params.sessionAnchorIso,
    params.journalSessionId,
  ]);

  const onSave = async (): Promise<void> => {
    if (!user || exerciseId.length === 0) {
      setError("Missing user or exercise.");
      return;
    }
    const cleanName = trimCollapse(name);
    if (cleanName.length === 0) {
      setError("Exercise name is required.");
      return;
    }
    let muscleContributions: MuscleContribution[] | undefined;
    const rawJson = muscleContributionsJson.trim();
    if (rawJson.length > 0) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson) as unknown;
      } catch {
        setError("Muscle contributions must be valid JSON.");
        return;
      }
      if (!Array.isArray(parsed)) {
        setError("Muscle contributions JSON must be an array.");
        return;
      }
      const normalized: MuscleContribution[] = [];
      for (const el of parsed) {
        if (!el || typeof el !== "object") continue;
        const o = el as Record<string, unknown>;
        const subgroup = typeof o.subgroup === "string" ? o.subgroup.trim() : "";
        const weight = typeof o.weight === "number" ? o.weight : Number.NaN;
        if (!isMuscleSubgroup(subgroup)) continue;
        if (!Number.isFinite(weight) || weight < 0) continue;
        normalized.push({ subgroup, weight });
      }
      if (!validateMuscleContributions(normalized)) {
        setError("Muscle contributions failed validation (subgroups / weights).");
        return;
      }
      muscleContributions = normalized;
    }

    const aliases = splitCommaList(aliasesText);
    const primaryMusclesDetailed = splitCommaList(primaryMusclesText);
    const secondaryMusclesDetailed = splitCommaList(secondaryMusclesText);

    const body: ExerciseDefinitionUpdateBody = {
      name: cleanName,
      equipment,
      primary,
      loggingType,
      aliases,
      movementPattern,
      primaryMusclesDetailed: primaryMusclesDetailed.length > 0 ? primaryMusclesDetailed : [],
      secondaryMusclesDetailed: secondaryMusclesDetailed.length > 0 ? secondaryMusclesDetailed : [],
    };
    if (muscleContributions != null) body.muscleContributions = muscleContributions;
    const iu = trimCollapse(imageUrl);
    const vu = trimCollapse(videoUrl);
    const mu = trimCollapse(mediaUrl);
    if (iu.length > 0) body.imageUrl = iu;
    if (vu.length > 0) body.videoUrl = vu;
    if (mu.length > 0) body.mediaUrl = mu;

    setSaveStatus("saving");
    setError(null);
    try {
      const token = await getIdToken(false);
      if (token) {
        const res = await updateExerciseDefinition(token, exerciseId, body);
        if (!res.ok) {
          throw new Error(res.error ?? "Unable to update exercise.");
        }
      }
      const localPatch: CustomExerciseUpdatePatch = {
        name: cleanName,
        equipment,
        primary,
        loggingType,
        movementPattern,
        aliases,
      };
      if (primaryMusclesDetailed.length > 0) {
        localPatch.primaryMusclesDetailed = primaryMusclesDetailed as MuscleGroupDetailed[];
      }
      if (secondaryMusclesDetailed.length > 0) {
        localPatch.secondaryMusclesDetailed = secondaryMusclesDetailed as MuscleGroupDetailed[];
      }
      if (muscleContributions != null) localPatch.muscleContributions = muscleContributions;
      if (iu.length > 0) localPatch.imageUrl = iu;
      if (vu.length > 0) localPatch.videoUrl = vu;
      if (mu.length > 0) localPatch.mediaUrl = mu;
      await updateCustomExercise(user.uid, exerciseId, localPatch);
      navigateAfterSave();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to save exercise.";
      setSaveStatus("idle");
      setError(message);
    }
  };

  if (loadStatus === "forbidden" || loadStatus === "notfound") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{loadStatus === "forbidden" ? "Cannot edit" : "Exercise not found"}</Text>
        <Text style={styles.subtitle}>
          {loadStatus === "forbidden"
            ? "You can only edit exercises created on this account."
            : "This exercise is not available on this device."}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.saveButton} accessibilityRole="button">
          <Text style={styles.saveButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (loadStatus === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Edit exercise</Text>
        <Text style={styles.subtitle}>Changes sync to your account when online.</Text>

        <Text style={styles.label}>Exercise name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Landmine press"
          style={styles.input}
          accessibilityLabel="Exercise name"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />

        <Text style={styles.label}>Aliases (comma-separated)</Text>
        <TextInput
          value={aliasesText}
          onChangeText={setAliasesText}
          placeholder="e.g. my press, landmine ohp"
          style={styles.input}
          accessibilityLabel="Aliases"
          autoCorrect={false}
        />

        <Text style={styles.label}>Equipment type</Text>
        <View style={styles.chipRow}>
          {EQUIPMENT_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setEquipment(opt)}
              style={[styles.chip, equipment === opt && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Equipment ${opt}`}
            >
              <Text style={[styles.chipText, equipment === opt && styles.chipTextSelected]}>{opt}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Primary muscle group</Text>
        <View style={styles.chipRow}>
          {PRIMARY_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setPrimary(opt)}
              style={[styles.chip, primary === opt && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Primary muscle ${opt}`}
            >
              <Text style={[styles.chipText, primary === opt && styles.chipTextSelected]}>{opt}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Movement pattern</Text>
        <View style={styles.chipRow}>
          {MOVEMENT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setMovementPattern(opt.value)}
              style={[styles.chip, movementPattern === opt.value && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Movement ${opt.label}`}
            >
              <Text style={[styles.chipText, movementPattern === opt.value && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Logging type</Text>
        <View style={styles.chipRow}>
          {LOGGING_TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setLoggingType(opt.value)}
              style={[styles.chip, loggingType === opt.value && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`Logging type ${opt.label}`}
            >
              <Text style={[styles.chipText, loggingType === opt.value && styles.chipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Primary muscles detailed (comma-separated, optional)</Text>
        <TextInput
          value={primaryMusclesText}
          onChangeText={setPrimaryMusclesText}
          placeholder="e.g. DeltsAnterior, UpperPecs"
          style={styles.input}
          accessibilityLabel="Primary muscles detailed"
          autoCorrect={false}
        />

        <Text style={styles.label}>Secondary muscles detailed (comma-separated, optional)</Text>
        <TextInput
          value={secondaryMusclesText}
          onChangeText={setSecondaryMusclesText}
          placeholder="e.g. Triceps"
          style={styles.input}
          accessibilityLabel="Secondary muscles detailed"
          autoCorrect={false}
        />

        <Text style={styles.label}>Muscle contributions (JSON array, optional)</Text>
        <TextInput
          value={muscleContributionsJson}
          onChangeText={setMuscleContributionsJson}
          placeholder='[{"subgroup":"upper_chest","weight":0.6}]'
          style={[styles.input, styles.multiline]}
          accessibilityLabel="Muscle contributions JSON"
          autoCorrect={false}
          multiline
        />

        <Text style={styles.label}>Image URL (optional)</Text>
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://…"
          style={styles.input}
          accessibilityLabel="Image URL"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Video URL (optional)</Text>
        <TextInput
          value={videoUrl}
          onChangeText={setVideoUrl}
          placeholder="https://…"
          style={styles.input}
          accessibilityLabel="Video URL"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Media URL (optional)</Text>
        <TextInput
          value={mediaUrl}
          onChangeText={setMediaUrl}
          placeholder="https://…"
          style={styles.input}
          accessibilityLabel="Media URL"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void onSave()}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          <Text style={styles.saveButtonText}>{saveStatus === "saving" ? "Saving…" : "Save changes"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: "#F2F2F7",
    padding: 16,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#1C1C1E" },
  subtitle: { fontSize: 14, color: "#6E6E73", marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "700", color: "#3A3A3C", marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#1C1C1E",
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#E5E5EA",
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: SYSTEM_ACCENT },
  chipText: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  chipTextSelected: { color: "#FFFFFF" },
  error: { color: "#B00020", fontSize: 13, fontWeight: "600", marginTop: 4 },
  saveButton: {
    marginTop: 10,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
