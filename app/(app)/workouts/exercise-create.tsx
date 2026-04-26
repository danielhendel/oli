import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkoutsNavBar } from "@/lib/ui/headers/WorkoutsNavBar";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Equipment, PrimaryBucket } from "@/lib/workouts/exercises/taxonomy";
import { createExerciseDefinition } from "@/lib/api/exerciseDefinitions";
import {
  createCustomExercise,
  type CustomExerciseLoggingType,
} from "@/lib/workouts/exercises/customExerciseStore";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  WORKOUT_LOGGER_COLORS,
  WORKOUT_LOGGER_LAYOUT,
  workoutLoggerTypography,
} from "@/lib/workouts/ui/workoutLoggerTheme";

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
      headerShown: false,
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screen}>
        <WorkoutsNavBar
          hideTitle
          surface="flush"
          contentPaddingHorizontal={16}
          rowMinHeight={56}
          leftColumnWidth={56}
          backButtonSize="large"
          onBackPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>Create exercise</Text>
          <Text style={styles.pageSubtitle}>Create it now and add it directly to this workout.</Text>

          <View style={styles.section} testID="exercise-create-section-name">
            <Text style={styles.sectionLabel}>Exercise name</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Leg Press Wide Stance"
              placeholderTextColor={WORKOUT_LOGGER_COLORS.textSecondary}
              style={styles.input}
              accessibilityLabel="Exercise name"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Equipment</Text>
            <Text style={styles.fieldLabel}>Type</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Primary muscle</Text>
            <Text style={styles.fieldLabel}>Target</Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Logging</Text>
            <Text style={styles.fieldLabel}>Type</Text>
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
        </ScrollView>
      </View>
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
  content: {
    flexGrow: 1,
    backgroundColor: WORKOUT_LOGGER_COLORS.pageBackground,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    ...workoutLoggerTypography.optionDescription,
    marginTop: 6,
    marginBottom: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    ...workoutLoggerTypography.sectionEyebrow,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: WORKOUT_LOGGER_COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.2)",
    borderRadius: WORKOUT_LOGGER_LAYOUT.cancelOutlineRadius,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: WORKOUT_LOGGER_COLORS.textPrimary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "rgba(60, 60, 67, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.1)",
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipSelected: { backgroundColor: SYSTEM_ACCENT },
  chipText: { fontSize: 15, fontWeight: "500", color: WORKOUT_LOGGER_COLORS.textPrimary, letterSpacing: -0.2 },
  chipTextSelected: { color: "#FFFFFF" },
  error: { color: "#B00020", fontSize: 13, fontWeight: "600", marginTop: 4, marginBottom: 6 },
  saveButton: {
    marginTop: 6,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: WORKOUT_LOGGER_LAYOUT.cancelOutlineRadius,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", letterSpacing: -0.22 },
});
