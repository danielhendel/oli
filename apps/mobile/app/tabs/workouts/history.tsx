import { View, Text, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { useWorkoutLogs } from "../../../hooks/useWorkoutLogs";
import WorkoutSummaryCard from "../../../components/workout/WorkoutSummaryCard";

export default function WorkoutHistoryScreen() {
  const { items, loading, error } = useWorkoutLogs();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerPadded}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutSummaryCard w={item} />}
        ListEmptyComponent={<Text style={styles.muted}>No workouts yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", padding: 16 },
  center: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  centerPadded: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", padding: 16 },
  muted: { color: "#a1a1aa", marginTop: 8 },
  error: { color: "#f87171" }
});
