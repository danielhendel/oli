import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import WorkoutLogger from "../../../components/workout/WorkoutLogger";
import { WorkoutLog } from "../../../lib/types/workout";
import { addWorkoutLog } from "../../../lib/db/workouts";
import { View, Text, StyleSheet } from "react-native";

export default function LogWorkoutScreen() {
  const uid = getAuth().currentUser?.uid ?? null;
  const router = useRouter();

  const [draft, setDraft] = useState<WorkoutLog>(() => ({
    id: "local",
    uid: uid ?? "anon",
    name: "Lower Body",
    date: new Date(),
    durationSec: 0,
    sections: [],
    totalVolume: 0
  }));

  const disabled = useMemo(() => !uid, [uid]);

  async function save() {
    if (!uid) throw new Error("Not signed in");
    // Omit `id` without creating an unused variable
    const payload = { ...draft };
    delete (payload as any).id;
    const created = await addWorkoutLog(uid, payload);
    setDraft(created);
    router.replace("/tabs/workouts/history");
  }

  return (
    <View style={styles.screen}>
      {disabled ? (
        <View style={styles.pad}>
          <Text style={styles.white}>Please sign in to log workouts.</Text>
        </View>
      ) : (
        <WorkoutLogger draft={draft} onChange={setDraft} onSave={save} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  pad: { padding: 16 },
  white: { color: "#fff" }
});
