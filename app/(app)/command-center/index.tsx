import { ScrollView, Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ModuleTile } from "@/lib/ui/ModuleTile";

export default function CommandCenterScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Command Center</Text>
        <Text style={styles.subtitle}>Your health, unified</Text>
      </View>

      <View style={styles.grid}>
        <ModuleTile
          id="body"
          title="Body"
          subtitle="Weight, DEXA, composition"
          onPress={() => router.push("/(app)/body")}
        />

        <ModuleTile
          id="training"
          title="Training"
          subtitle="Strength & cardio"
          onPress={() => router.push("/(app)/workouts")}
        />

        <ModuleTile
          id="nutrition"
          title="Nutrition"
          subtitle="Macros & micros"
          onPress={() => router.push("/(app)/nutrition")}
        />

        <ModuleTile
          id="recovery"
          title="Recovery"
          subtitle="Sleep & readiness"
          disabled
        />

        <ModuleTile
          id="labs"
          title="Labs"
          subtitle="Bloodwork & biomarkers"
          disabled
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  header: { gap: 6 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 16, opacity: 0.7 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }
});
