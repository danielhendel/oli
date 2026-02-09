// app/(app)/(tabs)/manage.tsx
import { ScrollView, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";

export default function ManageScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Manage</Text>
        <Text style={styles.subtitle}>
          Entry point for logging and management. Destructive actions require
          auth friction (Sprint 4+).
        </Text>
        <Text
          style={styles.link}
          onPress={() => router.push("/(app)/command-center")}
        >
          Open Command Center
        </Text>
        <Text
          style={styles.link}
          onPress={() => router.push("/(app)/log")}
        >
          Quick log (Phase 2)
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  subtitle: { fontSize: 15, color: "#8E8E93", marginTop: 4, lineHeight: 22 },
  link: { marginTop: 24, fontSize: 15, color: "#007AFF", fontWeight: "600" },
});
