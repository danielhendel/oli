import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { WeeklyFitnessGoalField } from "@/lib/preferences/weeklyFitnessGoals";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const FIELD_TITLES: Record<WeeklyFitnessGoalField, string> = {
  activityStepsPerDayGoal: "Daily steps goal",
  strengthWorkoutsPerWeekGoal: "Strength workouts per week",
  cardioMilesPerWeekGoal: "Cardio miles per week",
  sleepHoursPerNightGoal: "Sleep per night",
};

const FIELD_HINTS: Record<WeeklyFitnessGoalField, string> = {
  activityStepsPerDayGoal: "Average daily steps target across the week.",
  strengthWorkoutsPerWeekGoal: "Number of strength sessions per week.",
  cardioMilesPerWeekGoal: "Total cardio miles per week.",
  sleepHoursPerNightGoal: "Average nightly sleep target across the week.",
};

const FIELD_UNITS: Record<WeeklyFitnessGoalField, string> = {
  activityStepsPerDayGoal: "steps / day",
  strengthWorkoutsPerWeekGoal: "workouts / week",
  cardioMilesPerWeekGoal: "miles / week",
  sleepHoursPerNightGoal: "hours / night",
};

const FIELD_KEYBOARD: Record<WeeklyFitnessGoalField, "number-pad" | "decimal-pad"> = {
  activityStepsPerDayGoal: "number-pad",
  strengthWorkoutsPerWeekGoal: "number-pad",
  cardioMilesPerWeekGoal: "decimal-pad",
  sleepHoursPerNightGoal: "decimal-pad",
};

export type WeeklyFitnessGoalsFormProps = {
  explainer: string;
  isSignedOut: boolean;
  saving: boolean;
  showSavingSpinner: boolean;
  showErrorBanner: boolean;
  errorMessage: string | null;
  fieldTexts: Record<WeeklyFitnessGoalField, string>;
  errorByField: Partial<Record<WeeklyFitnessGoalField, string>>;
  onChangeField: (field: WeeklyFitnessGoalField, text: string) => void;
  onSave: () => void;
};

export function WeeklyFitnessGoalsForm({
  explainer,
  isSignedOut,
  saving,
  showSavingSpinner,
  showErrorBanner,
  errorMessage,
  fieldTexts,
  errorByField,
  onChangeField,
  onSave,
}: WeeklyFitnessGoalsFormProps): React.ReactElement {
  const fields: WeeklyFitnessGoalField[] = [
    "activityStepsPerDayGoal",
    "strengthWorkoutsPerWeekGoal",
    "cardioMilesPerWeekGoal",
    "sleepHoursPerNightGoal",
  ];

  return (
    <>
      <Text style={styles.lede}>{explainer}</Text>

      {isSignedOut ? (
        <Text style={styles.muted}>Sign in to save your weekly fitness goals to your account.</Text>
      ) : null}

      <View style={styles.listGroup} accessibilityLabel="Weekly fitness goals form">
        {fields.map((fieldId) => (
          <GoalRow
            key={fieldId}
            fieldId={fieldId}
            title={FIELD_TITLES[fieldId]}
            hint={FIELD_HINTS[fieldId]}
            unitSuffix={FIELD_UNITS[fieldId]}
            keyboardType={FIELD_KEYBOARD[fieldId]}
            value={fieldTexts[fieldId]}
            onChangeText={(text) => onChangeField(fieldId, text)}
            error={errorByField[fieldId]}
            editable={!saving}
          />
        ))}
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

      {showSavingSpinner ? (
        <View style={styles.savingRow}>
          <ActivityIndicator />
          <Text style={styles.muted}>Saving…</Text>
        </View>
      ) : null}

      {showErrorBanner && errorMessage ? (
        <Text style={styles.errorBanner} testID="fitness-goals-server-error">
          Couldn’t save goals: {errorMessage}
        </Text>
      ) : null}
    </>
  );
}

function GoalRow(props: {
  fieldId: WeeklyFitnessGoalField;
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
  savingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorBanner: {
    fontSize: 14,
    color: "#FF6E6E",
    lineHeight: 20,
  },
});
