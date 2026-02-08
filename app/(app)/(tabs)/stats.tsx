// app/(app)/(tabs)/stats.tsx
import { View, Text, StyleSheet } from "react-native";
import { ScreenContainer } from "@/lib/ui/ScreenStates";

export default function StatsScreen() {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.placeholder}>
          Interpretive surface — placeholder for Sprint 3.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "900", color: "#1C1C1E" },
  placeholder: {
    marginTop: 8,
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 22,
  },
});
