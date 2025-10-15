/**
 * Purpose: In-session logger UI with auto volume calc and save callback.
 */
import { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, Alert, ScrollView, StyleSheet } from "react-native";
import { SectionEntry, WorkoutLog, computeTotalVolume } from "../../lib/types/workout";
import ExerciseTile from "./ExerciseTile";

type Props = {
  draft: WorkoutLog;
  onChange: (next: WorkoutLog) => void;
  onSave: () => Promise<void>;
};

export default function WorkoutLogger({ draft, onChange, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const totalVolume = useMemo(() => computeTotalVolume(draft.sections), [draft.sections]);

  const updateSection = (index: number, next: SectionEntry) => {
    const copy: WorkoutLog = { ...draft, sections: [...draft.sections] };
    copy.sections[index] = next;
    copy.totalVolume = computeTotalVolume(copy.sections);
    onChange(copy);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TextInput
          accessibilityLabel="Workout Name"
          style={styles.nameInput}
          defaultValue={draft.name}
          onEndEditing={(e) => onChange({ ...draft, name: e.nativeEvent.text || "Workout" })}
        />
        <Text style={styles.total}>Total Volume: {totalVolume}</Text>
      </View>

      <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollerContent}>
        {draft.sections.map((s, si) => (
          <View key={s.id}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {s.exercises.map((_, ei) => (
              <ExerciseTile key={ei} section={s} exIndex={ei} onChange={(next) => updateSection(si, next)} />
            ))}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          style={styles.addBtn}
          onPress={() => {
            const next: SectionEntry = {
              id: Math.random().toString(36).slice(2),
              type: "Set",
              title: "New Section",
              exercises: [
                {
                  id: Math.random().toString(36).slice(2),
                  name: "Barbell Squat",
                  muscleGroup: "quads",
                  movementType: "compound",
                  sets: [{ reps: 8, weight: 135 }, { reps: 8, weight: 135 }]
                }
              ]
            };
            onChange({ ...draft, sections: [...draft.sections, next] });
          }}
        >
          <Text style={styles.addTxt}>+ Add Section</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.saveBar} accessibilityLiveRegion="polite">
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={async () => {
            try {
              setSaving(true);
              await onSave();
              Alert.alert("Saved", "Workout saved successfully.");
            } catch {
              Alert.alert("Save failed", "Please try again.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Text style={styles.saveTxt}>{saving ? "Saving…" : "Save Workout"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  nameInput: {
    backgroundColor: "#18181b",
    color: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18
  },
  total: { color: "#a1a1aa", marginTop: 8 },
  scroller: { paddingHorizontal: 16 },
  scrollerContent: { paddingBottom: 120 },
  sectionTitle: { color: "#d4d4d8", marginBottom: 4, marginTop: 8 },
  addBtn: { marginTop: 8, backgroundColor: "#27272a", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  addTxt: { color: "#fff", textAlign: "center" },
  saveBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#18181b", paddingHorizontal: 16, paddingVertical: 12 },
  saveBtn: { backgroundColor: "#10b981", borderRadius: 16, paddingVertical: 12 },
  saveTxt: { color: "#000", textAlign: "center", fontWeight: "600" }
});
