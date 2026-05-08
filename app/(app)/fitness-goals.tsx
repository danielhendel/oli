// app/(app)/fitness-goals.tsx — Dash Weekly Fitness goals editor
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth/AuthProvider";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  resolveWeeklyFitnessGoals,
  validateWeeklyFitnessGoalsInput,
  type WeeklyFitnessGoalsInput,
  type WeeklyFitnessGoalsValidationError,
} from "@/lib/preferences/weeklyFitnessGoals";
import {
  UI_APP_SCREEN_BG,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type RowFieldId =
  | "activityStepsPerDayGoal"
  | "strengthWorkoutsPerWeekGoal"
  | "cardioMilesPerWeekGoal";

const FIELD_TITLES: Record<RowFieldId, string> = {
  activityStepsPerDayGoal: "Daily steps goal",
  strengthWorkoutsPerWeekGoal: "Strength workouts per week",
  cardioMilesPerWeekGoal: "Cardio miles per week",
};

const FIELD_HINTS: Record<RowFieldId, string> = {
  activityStepsPerDayGoal: "Average daily steps target across the week.",
  strengthWorkoutsPerWeekGoal: "Number of strength sessions per week.",
  cardioMilesPerWeekGoal: "Total cardio miles per week.",
};

function parseNumber(text: string): number {
  const t = text.trim().replace(/,/g, "");
  if (!t) return Number.NaN;
  const n = Number(t);
  return n;
}

export default function FitnessGoalsScreen() {
  const router = useRouter();
  const { user, initializing } = useAuth();
  const { state, setWeeklyFitnessGoals } = usePreferences();

  const resolved = useMemo(() => resolveWeeklyFitnessGoals(state.preferences), [state.preferences]);

  const [stepsText, setStepsText] = useState<string>(String(resolved.activityStepsPerDayGoal));
  const [workoutsText, setWorkoutsText] = useState<string>(String(resolved.strengthWorkoutsPerWeekGoal));
  const [milesText, setMilesText] = useState<string>(String(resolved.cardioMilesPerWeekGoal));
  const [errors, setErrors] = useState<readonly WeeklyFitnessGoalsValidationError[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Hydrate inputs once preferences load (e.g. after auto-refresh on auth ready).
  useEffect(() => {
    setStepsText(String(resolved.activityStepsPerDayGoal));
    setWorkoutsText(String(resolved.strengthWorkoutsPerWeekGoal));
    setMilesText(String(resolved.cardioMilesPerWeekGoal));
  }, [resolved.activityStepsPerDayGoal, resolved.cardioMilesPerWeekGoal, resolved.strengthWorkoutsPerWeekGoal]);

  const errorByField = useMemo(() => {
    const m: Partial<Record<RowFieldId, string>> = {};
    for (const e of errors) m[e.field] = e.message;
    return m;
  }, [errors]);

  const onSave = async () => {
    const candidate: WeeklyFitnessGoalsInput = {
      activityStepsPerDayGoal: parseNumber(stepsText),
      strengthWorkoutsPerWeekGoal: parseNumber(workoutsText),
      cardioMilesPerWeekGoal: parseNumber(milesText),
    };
    const found = validateWeeklyFitnessGoalsInput(candidate);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const ok = await setWeeklyFitnessGoals(candidate);
      if (ok) {
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  };

  const showSavedBanner = savedAt != null && state.status === "ready" && errors.length === 0;
  const showErrorBanner = state.status === "error";
  const showSavingSpinner = saving || (state.status === "partial" && !initializing);
  const isSignedOut = !user && !initializing;

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.lede}>
        Weekly Fitness Goals personalize the Dash card. They only affect display — your stored health data is never
        rewritten.
      </Text>

      {isSignedOut ? (
        <Text style={styles.muted}>Sign in to save your weekly fitness goals to your account.</Text>
      ) : null}

      <View style={styles.listGroup} accessibilityLabel="Weekly fitness goals form">
        <GoalRow
          fieldId="activityStepsPerDayGoal"
          title={FIELD_TITLES.activityStepsPerDayGoal}
          hint={FIELD_HINTS.activityStepsPerDayGoal}
          unitSuffix="steps / day"
          keyboardType="number-pad"
          value={stepsText}
          onChangeText={setStepsText}
          error={errorByField.activityStepsPerDayGoal}
          editable={!saving}
        />
        <GoalRow
          fieldId="strengthWorkoutsPerWeekGoal"
          title={FIELD_TITLES.strengthWorkoutsPerWeekGoal}
          hint={FIELD_HINTS.strengthWorkoutsPerWeekGoal}
          unitSuffix="workouts / week"
          keyboardType="number-pad"
          value={workoutsText}
          onChangeText={setWorkoutsText}
          error={errorByField.strengthWorkoutsPerWeekGoal}
          editable={!saving}
        />
        <GoalRow
          fieldId="cardioMilesPerWeekGoal"
          title={FIELD_TITLES.cardioMilesPerWeekGoal}
          hint={FIELD_HINTS.cardioMilesPerWeekGoal}
          unitSuffix="miles / week"
          keyboardType="decimal-pad"
          value={milesText}
          onChangeText={setMilesText}
          error={errorByField.cardioMilesPerWeekGoal}
          editable={!saving}
        />
      </View>

      <Pressable
        style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
        disabled={saving}
        onPress={() => void onSave()}
        accessibilityRole="button"
        accessibilityLabel="Save weekly fitness goals"
        testID="fitness-goals-save"
      >
        <Text style={styles.primaryBtnText}>{saving ? "Saving…" : "Save"}</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryBtn}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.secondaryBtnText}>Back</Text>
      </Pressable>

      {showSavingSpinner ? (
        <View style={styles.savingRow}>
          <ActivityIndicator />
          <Text style={styles.muted}>Saving…</Text>
        </View>
      ) : null}

      {showSavedBanner ? <Text style={styles.savedBanner}>Saved</Text> : null}

      {showErrorBanner ? (
        <Text style={styles.errorBanner} testID="fitness-goals-server-error">
          Couldn’t save goals: {state.message}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function GoalRow(props: {
  fieldId: RowFieldId;
  title: string;
  hint: string;
  unitSuffix: string;
  keyboardType: "number-pad" | "decimal-pad";
  value: string;
  onChangeText: (text: string) => void;
  error?: string | undefined;
  editable: boolean;
}) {
  return (
    <View style={styles.rowWrap}>
      <Text style={styles.rowTitle}>{props.title}</Text>
      <Text style={styles.rowHint}>{props.hint}</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          keyboardType={props.keyboardType}
          editable={props.editable}
          style={[styles.input, props.error ? styles.inputError : null]}
          accessibilityLabel={props.title}
          testID={`fitness-goals-input-${props.fieldId}`}
        />
        <Text style={styles.unit}>{props.unitSuffix}</Text>
      </View>
      {props.error ? (
        <Text style={styles.errorMessage} testID={`fitness-goals-error-${props.fieldId}`}>
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: UI_APP_SCREEN_BG },
  pad: { padding: 16, paddingBottom: 40, gap: 16 },
  lede: { fontSize: 15, color: UI_TEXT_SECONDARY, lineHeight: 22 },
  muted: { fontSize: 14, color: UI_TEXT_MUTED, lineHeight: 20 },
  listGroup: {
    borderRadius: 12,
    backgroundColor: UI_CARD_SURFACE,
    overflow: "hidden",
  },
  rowWrap: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(120,120,128,0.24)",
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY, letterSpacing: -0.2 },
  rowHint: { fontSize: 13, color: UI_TEXT_SECONDARY, lineHeight: 18 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(120,120,128,0.32)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontVariant: ["tabular-nums"],
    color: UI_TEXT_PRIMARY,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inputError: {
    borderColor: "#FF6E6E",
  },
  unit: { fontSize: 14, color: UI_TEXT_SECONDARY, minWidth: 110 },
  errorMessage: { fontSize: 13, color: "#FF6E6E", lineHeight: 18 },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#1C1C1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  secondaryBtn: { paddingVertical: 12, paddingHorizontal: 16, alignSelf: "flex-start" },
  secondaryBtnText: { fontSize: 15, fontWeight: "600", color: UI_TEXT_SECONDARY },
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  savedBanner: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5EE89A",
  },
  errorBanner: {
    fontSize: 14,
    color: "#FF6E6E",
    lineHeight: 20,
  },
});
