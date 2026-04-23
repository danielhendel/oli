import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Equipment, PrimaryBucket } from "@/lib/workouts/exercises/taxonomy";
import { createExerciseDefinition } from "@/lib/api/exerciseDefinitions";
import {
  createCustomExercise,
  type CustomExerciseLoggingType,
} from "@/lib/workouts/exercises/customExerciseStore";
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

function trimCollapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export default function CreateExerciseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    sessionId?: string;
    blockId?: string;
    logReturnPath?: string;
    enrichDay?: string;
    enrichTargetId?: string;
    sessionAnchorIso?: string;
    journalSessionId?: string;
  }>();
  const { user, initializing, getIdToken } = useAuth();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("task"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  const sessionId = typeof params.sessionId === "string" ? params.sessionId : undefined;
  const blockId = typeof params.blockId === "string" ? params.blockId : undefined;
  const returnToEnrich = params.logReturnPath === "enrich";
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("Machine");
  const [primary, setPrimary] = useState<PrimaryBucket | "Other">("Full body");
  const [loggingType, setLoggingType] = useState<CustomExerciseLoggingType>("weight_reps");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    if (status === "saving") return false;
    if (!user || initializing) return false;
    if (!sessionId) return false;
    return trimCollapse(name).length > 0;
  }, [status, user, initializing, sessionId, name]);

  const onSave = async (): Promise<void> => {
    if (!user || !sessionId) {
      setStatus("error");
      setError("Missing workout context.");
      return;
    }
    const cleanName = trimCollapse(name);
    if (cleanName.length === 0) {
      setStatus("error");
      setError("Exercise name is required.");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const created = await createCustomExercise(user.uid, {
        name: cleanName,
        equipment,
        primary,
        loggingType,
      });
      const token = await getIdToken(false);
      if (token) {
        void createExerciseDefinition(token, {
          name: created.name,
          equipment: created.equipment,
          primary: created.primary,
          loggingType: created.loggingType,
          exerciseId: created.exerciseId,
        });
      }
      const pathname = returnToEnrich ? "/(app)/workouts/enrich" : "/(app)/workouts/log";
      const nextParams: Record<string, string> = {
        sessionId,
        pickedExerciseId: created.exerciseId,
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to create exercise.";
      setStatus("error");
      setError(message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Create exercise</Text>
        <Text style={styles.subtitle}>Create it now and add it directly to this workout.</Text>

        <Text style={styles.label}>Exercise name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Leg Press Wide Stance"
          style={styles.input}
          accessibilityLabel="Exercise name"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void onSave()}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save exercise"
        >
          <Text style={styles.saveButtonText}>{status === "saving" ? "Saving..." : "Save exercise"}</Text>
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
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
