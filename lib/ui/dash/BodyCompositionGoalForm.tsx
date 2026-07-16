import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { BodyCompositionPrimaryMetric } from "@oli/contracts";
import type { UseBodyCompositionGoalEditorResult } from "@/lib/preferences/useBodyCompositionGoalEditor";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const METRICS: BodyCompositionPrimaryMetric[] = ["weight", "bodyFat", "leanMass"];

type Props = {
  editor: UseBodyCompositionGoalEditorResult;
};

export function BodyCompositionGoalForm({ editor }: Props): React.ReactElement {
  return (
    <View style={styles.section} accessibilityLabel="Body composition goal form">
      <Text style={styles.sectionTitle}>Body Composition Goal</Text>
      <Text style={styles.lede}>{editor.explainer}</Text>

      <Text style={styles.rowTitle}>Primary metric</Text>
      <View style={styles.metricRow}>
        {METRICS.map((m) => {
          const selected = editor.primaryMetric === m;
          return (
            <Pressable
              key={m}
              onPress={() => editor.setPrimaryMetric(m)}
              style={[styles.metricChip, selected && styles.metricChipSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={editor.metricLabels[m]}
              testID={`body-goal-metric-${m}`}
            >
              <Text style={[styles.metricChipText, selected && styles.metricChipTextSelected]}>
                {editor.metricLabels[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.rowTitle}>Current</Text>
      <Text style={styles.currentValue} testID="body-goal-current-value">
        {editor.currentValueLabel}
      </Text>

      <Text style={styles.rowTitle}>Target</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={editor.targetText}
          onChangeText={editor.setTargetText}
          keyboardType="decimal-pad"
          editable={!editor.saving}
          style={[styles.input, editor.errorMessage ? styles.inputError : null]}
          accessibilityLabel="Body composition target"
          testID="body-goal-target-input"
        />
        <Text style={styles.unit}>{editor.targetUnitSuffix}</Text>
      </View>

      {editor.errorMessage ? (
        <Text style={styles.errorMessage} testID="body-goal-error">
          {editor.errorMessage}
        </Text>
      ) : null}

      <Pressable
        style={[styles.primaryBtn, editor.saving && styles.primaryBtnDisabled]}
        disabled={editor.saving}
        onPress={() => void editor.save()}
        accessibilityRole="button"
        accessibilityLabel="Save body composition goal"
        testID="body-goal-save"
      >
        <Text style={styles.primaryBtnText}>{editor.saving ? "Saving…" : "Save body goal"}</Text>
      </Pressable>

      {editor.hasExistingGoal ? (
        <Pressable
          style={styles.clearBtn}
          disabled={editor.saving}
          onPress={() => void editor.clear()}
          accessibilityRole="button"
          accessibilityLabel="Clear body composition goal"
          testID="body-goal-clear"
        >
          <Text style={styles.clearBtnText}>Clear body goal</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    backgroundColor: UI_CARD_SURFACE,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  lede: { fontSize: 14, color: UI_TEXT_SECONDARY, lineHeight: 20 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: UI_TEXT_PRIMARY, marginTop: 4 },
  metricRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(120,120,128,0.16)",
    minHeight: 44,
    justifyContent: "center",
  },
  metricChipSelected: { backgroundColor: "#1C1C1E" },
  metricChipText: { fontSize: 14, fontWeight: "600", color: UI_TEXT_PRIMARY },
  metricChipTextSelected: { color: "#FFF" },
  currentValue: { fontSize: 16, color: UI_TEXT_MUTED, fontVariant: ["tabular-nums"] },
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
  inputError: { borderColor: "#FF6E6E" },
  unit: { fontSize: 14, color: UI_TEXT_SECONDARY, minWidth: 36 },
  errorMessage: { fontSize: 13, color: "#FF6E6E", lineHeight: 18 },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: "#1C1C1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  clearBtn: { paddingVertical: 12, alignItems: "center", minHeight: 44 },
  clearBtnText: { color: "#FF6E6E", fontWeight: "600", fontSize: 15 },
});
