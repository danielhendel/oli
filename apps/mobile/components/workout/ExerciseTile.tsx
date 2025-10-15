/**
 * Purpose: Collapsible exercise tile with set rows for reps/weight/RPE.
 */
import { useMemo } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { SectionEntry, computeTotalVolume } from "../../lib/types/workout";

type Props = {
  section: SectionEntry;
  exIndex: number;
  onChange: (next: SectionEntry) => void;
};

export default function ExerciseTile({ section, exIndex, onChange }: Props) {
  const ex = section.exercises[exIndex];

  // Hook must be called unconditionally
  const vol = useMemo(
    () => (ex ? computeTotalVolume([{ ...section, exercises: [ex] }]) : 0),
    [ex, section]
  );

  // Now it’s safe to early-return after hooks are declared
  if (!ex) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{ex.name}</Text>
      <Text style={styles.sub}>Volume: {vol}</Text>

      {ex.sets.map((s, i) => (
        <View key={i} style={styles.setRow}>
          <Text style={styles.setLabel}>Set {i + 1}</Text>

          <TextInput
            accessibilityLabel={`Reps for set ${i + 1}`}
            keyboardType="number-pad"
            style={[styles.input, { width: 64 }]}
            defaultValue={String(s.reps ?? "")}
            onEndEditing={(e) => {
              const reps = Number(e.nativeEvent.text || 0);
              const next = { ...section };
              next.exercises = [...next.exercises];
              next.exercises[exIndex] = {
                ...ex,
                sets: ex.sets.map((set, idx) => (idx === i ? { ...set, reps } : set))
              };
              onChange(next);
            }}
          />

          <Text style={styles.mul}>x</Text>

          <TextInput
            accessibilityLabel={`Weight for set ${i + 1}`}
            keyboardType="decimal-pad"
            style={[styles.input, { width: 80 }]}
            defaultValue={String(s.weight ?? "")}
            onEndEditing={(e) => {
              const weight = Number(e.nativeEvent.text || 0);
              const next = { ...section };
              next.exercises = [...next.exercises];
              next.exercises[exIndex] = {
                ...ex,
                sets: ex.sets.map((set, idx) => (idx === i ? { ...set, weight } : set))
              };
              onChange(next);
            }}
          />

          <Text style={styles.unit}>lb</Text>

          <TextInput
            accessibilityLabel={`RPE for set ${i + 1}`}
            keyboardType="decimal-pad"
            style={[styles.input, { width: 56 }]}
            placeholder="RPE"
            defaultValue={s.rpe ? String(s.rpe) : ""}
            onEndEditing={(e) => {
              const rpe = Number(e.nativeEvent.text || 0);
              const next = { ...section };
              next.exercises = [...next.exercises];
              next.exercises[exIndex] = {
                ...ex,
                sets: ex.sets.map((set, idx) => (idx === i ? { ...set, rpe: rpe || undefined } : set))
              };
              onChange(next);
            }}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#27272a", borderRadius: 16, padding: 12, marginBottom: 12 },
  name: { color: "#fff", fontWeight: "600" },
  sub: { color: "#a1a1aa", marginBottom: 8 },
  setRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  setLabel: { color: "#d4d4d8", width: 56 },
  mul: { color: "#d4d4d8" },
  unit: { color: "#d4d4d8" },
  input: { backgroundColor: "#18181b", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: "#fff" }
});
