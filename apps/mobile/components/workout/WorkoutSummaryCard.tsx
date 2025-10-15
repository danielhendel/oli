/**
 * Purpose: Display quick stats for a workout (name, date, volume, duration).
 */
import { View, Text, StyleSheet } from "react-native";
import { WorkoutLog } from "../../lib/types/workout";

export default function WorkoutSummaryCard({ w }: { w: WorkoutLog }) {
  const dateStr = new Date(w.date).toLocaleDateString();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{w.name}</Text>
      <Text style={styles.sub}>{dateStr}</Text>
      <View style={styles.row}>
        <Text style={styles.metric}>Volume: {Math.round(w.totalVolume)}</Text>
        <Text style={styles.metric}>Duration: {Math.round((w.durationSec || 0) / 60)}m</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: "#18181b", borderRadius: 16, marginBottom: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  sub: { color: "#a1a1aa", marginTop: 2 },
  row: { flexDirection: "row", gap: 24, marginTop: 8 },
  metric: { color: "#fff" }
});
