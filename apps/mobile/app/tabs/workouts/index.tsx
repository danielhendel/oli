import { Link } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function WorkoutHub() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Workout Hub</Text>
      <Link href="/tabs/workouts/log" asChild>
        <Text style={styles.link}>➕ Start / Log Workout</Text>
      </Link>
      <Link href="/tabs/workouts/history" asChild>
        <Text style={styles.link}>📜 View History</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", padding: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  link: { color: "#34d399", marginBottom: 12 }
});
