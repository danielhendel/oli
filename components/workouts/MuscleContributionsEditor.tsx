import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput } from "react-native";

import { MuscleSubgroupPickerModal } from "@/components/workouts/MuscleSubgroupPickerModal";
import type { MuscleContribution, MuscleSubgroup } from "@/lib/workouts/exercises/taxonomy";
import { subgroupToGroupMap } from "@/lib/workouts/exercises/taxonomy";
import {
  isMuscleSplitTotalUnit,
  muscleContributionWeightSum,
  normalizeMuscleContributionsToUnit,
} from "@/lib/workouts/exercises/muscleContributionSplit";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

const SUBGROUPS_SORTED: MuscleSubgroup[] = (Object.keys(subgroupToGroupMap) as MuscleSubgroup[]).sort((a, b) =>
  a.localeCompare(b),
);

type Props = {
  value: MuscleContribution[];
  onChange: (next: MuscleContribution[]) => void;
};

export function MuscleContributionsEditor({ value, onChange }: Props): React.ReactElement {
  const valueKey = useMemo(() => JSON.stringify(value), [value]);
  const [weightTexts, setWeightTexts] = useState<string[]>(() => value.map((v) => weightToText(v.weight)));
  const [pickerRowIndex, setPickerRowIndex] = useState<number | null>(null);

  useEffect(() => {
    setWeightTexts(value.map((v) => weightToText(v.weight)));
  }, [valueKey, value]);

  const total = useMemo(() => muscleContributionWeightSum(value), [value]);
  const totalPct = Math.round(total * 1000) / 10;
  const showTotalRow = value.length > 0;
  const totalOk = value.length === 0 || isMuscleSplitTotalUnit(total);

  const hint = useMemo(
    () =>
      "Optional: split stimulus across predefined muscle subgroups. Weights are relative shares (100% = 1.0).",
    [],
  );

  const addRow = (): void => {
    const first = SUBGROUPS_SORTED[0] ?? "upper_chest";
    onChange([...value, { subgroup: first, weight: 0.5 }]);
  };

  const updateSubgroup = (index: number, subgroup: MuscleSubgroup): void => {
    onChange(value.map((row, i) => (i === index ? { ...row, subgroup } : row)));
  };

  const updateWeightText = (index: number, text: string): void => {
    const sanitized = sanitizeDecimalInput(text);
    setWeightTexts((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    const parsed = parseNonnegativeNumber(sanitized);
    if (parsed == null) return;
    onChange(value.map((row, i) => (i === index ? { ...row, weight: parsed } : row)));
  };

  const removeAt = (index: number): void => {
    onChange(value.filter((_, i) => i !== index));
  };

  const onNormalize = (): void => {
    if (value.length === 0) return;
    onChange(normalizeMuscleContributionsToUnit(value));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>{hint}</Text>
      {value.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>No muscle split yet</Text>
          <Text style={styles.emptySubtitle}>Add muscles for better volume insights</Text>
        </View>
      ) : (
        <>
          {value.map((row, index) => (
            <View key={`${row.subgroup}-${index}`} style={styles.row}>
              <Pressable
                onPress={() => setPickerRowIndex(index)}
                style={styles.subgroupBtn}
                accessibilityRole="button"
                accessibilityLabel={`Choose muscle for row ${index + 1}, ${formatSubgroupLabel(row.subgroup)}`}
              >
                <Text style={styles.subgroupBtnLabel} numberOfLines={2}>
                  {formatSubgroupLabel(row.subgroup)}
                </Text>
                <Text style={styles.subgroupBtnHint}>Predefined list · tap to change</Text>
              </Pressable>
              <TextInput
                value={weightTexts[index] ?? ""}
                onChangeText={(t) => updateWeightText(index, t)}
                keyboardType="decimal-pad"
                placeholder="0.5"
                style={styles.weightInput}
                accessibilityLabel={`Weight share row ${index + 1}`}
              />
              <Pressable
                onPress={() => removeAt(index)}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel={`Remove muscle row ${index + 1}`}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {showTotalRow ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={[styles.totalValue, !totalOk && styles.totalValueWarn]}>{totalPct}%</Text>
            </View>
          ) : null}
          {!totalOk ? (
            <Text style={styles.warnText}>
              Splits should add up to 100% for consistent volume attribution. You can still save — use Normalize or
              adjust weights.
            </Text>
          ) : null}
          <Pressable
            onPress={onNormalize}
            disabled={value.length === 0}
            style={[styles.normalizeBtn, value.length === 0 && styles.normalizeBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Normalize muscle split to 100 percent"
          >
            <Text style={[styles.normalizeBtnText, value.length === 0 && styles.normalizeBtnTextDisabled]}>
              Normalize to 100%
            </Text>
          </Pressable>
        </>
      )}
      <Pressable onPress={addRow} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add muscle">
        <Text style={styles.addBtnText}>+ Add muscle</Text>
      </Pressable>

      <MuscleSubgroupPickerModal
        visible={pickerRowIndex != null}
        onRequestClose={() => setPickerRowIndex(null)}
        onSelect={(sg) => {
          if (pickerRowIndex == null) return;
          updateSubgroup(pickerRowIndex, sg);
        }}
      />
    </View>
  );
}

function sanitizeDecimalInput(text: string): string {
  const noMinus = text.replace(/-/g, "");
  const only = noMinus.replace(/[^0-9.]/g, "");
  const i = only.indexOf(".");
  if (i === -1) return only;
  return only.slice(0, i + 1) + only.slice(i + 1).replace(/\./g, "");
}

function weightToText(w: number): string {
  if (!Number.isFinite(w) || w === 0) return "";
  return String(w);
}

function parseNonnegativeNumber(text: string): number | null {
  const t = text.trim();
  if (t.length === 0) return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatSubgroupLabel(sg: MuscleSubgroup): string {
  const g = subgroupToGroupMap[sg];
  return `${g}: ${sg.replace(/_/g, " ")}`;
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  hint: { fontSize: 12, color: "#6E6E73", lineHeight: 16 },
  emptyBlock: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9F9FB",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
    gap: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#3A3A3C" },
  emptySubtitle: { fontSize: 13, color: "#8E8E93", lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  subgroupBtn: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  subgroupBtnLabel: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },
  subgroupBtnHint: { fontSize: 11, color: "#8E8E93", marginTop: 4 },
  weightInput: {
    width: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#1C1C1E",
    backgroundColor: "#FFFFFF",
  },
  removeBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#E5E5EA",
  },
  removeBtnText: { fontSize: 16, color: "#3A3A3C", fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#3A3A3C" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#1C1C1E" },
  totalValueWarn: { color: "#B45309" },
  warnText: { fontSize: 13, color: "#B45309", lineHeight: 18, fontWeight: "600" },
  normalizeBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#E5E5EA",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
  },
  normalizeBtnDisabled: { opacity: 0.45 },
  normalizeBtnText: { fontSize: 14, fontWeight: "700", color: "#1C1C1E" },
  normalizeBtnTextDisabled: { color: "#8E8E93" },
  addBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
  },
  addBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
