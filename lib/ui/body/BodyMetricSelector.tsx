import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BodyTrendMetric } from "@/lib/data/body/useBodyMetricTrends";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";

export const BODY_TREND_OPTIONS: { id: BodyTrendMetric; label: string }[] = [
  { id: "weight", label: "Weight" },
  { id: "body_fat_percent", label: "Body Fat" },
  { id: "bmi", label: "BMI" },
  { id: "lean_body_mass", label: "Lean Mass" },
  { id: "resting_metabolic_rate", label: "RMR" },
];

export function BodyMetricSelector(props: {
  value: BodyTrendMetric;
  onChange: (next: BodyTrendMetric) => void;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      {BODY_TREND_OPTIONS.map((opt) => {
        const active = props.value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => props.onChange(opt.id)}
            accessibilityRole="button"
            accessibilityLabel={`Select body trend metric ${opt.label}`}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F2F2F7",
  },
  pillActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  pillText: { fontSize: 12, color: "#3C3C43", fontWeight: "600" },
  pillTextActive: { color: BODY_INDIGO },
});
