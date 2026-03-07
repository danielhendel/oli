/**
 * Exercise History — stub screen. Navigated from "Last" summary tap in workout logger.
 * TODO: Implement per-exercise history (sets over time from journal).
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ExerciseHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string }>();
  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId : null;

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backBtnText}>Back</Text>
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.title}>Exercise History</Text>
        <Text style={styles.muted}>
          {exerciseId ? `Exercise: ${exerciseId}` : "No exercise selected."}
        </Text>
        <Text style={styles.muted}>Coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2F2F7" },
  backBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  backBtnText: { fontSize: 17, fontWeight: "600", color: "#007AFF" },
  content: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#1C1C1E" },
  muted: { fontSize: 14, color: "#6E6E73" },
});
