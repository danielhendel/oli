import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

import { UI_CARD_SURFACE, UI_SCREEN_BG } from "@/lib/ui/theme/uiTokens";
export default function EditWorkoutDurationScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("task"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);
  const params = useLocalSearchParams<{
    workoutId?: string;
    currentDurationMinutes?: string;
  }>();
  const workoutId = typeof params.workoutId === "string" ? params.workoutId : "";
  const currentDuration = typeof params.currentDurationMinutes === "string" ? params.currentDurationMinutes : "";
  const [nextDuration, setNextDuration] = useState(currentDuration);
  const [saving, setSaving] = useState(false);
  const { saveOverride } = useWorkoutOverrides(useMemo(() => (workoutId ? [workoutId] : []), [workoutId]));

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <Text style={styles.title}>Edit duration</Text>
        <Text style={styles.description}>Adjust the displayed workout duration in minutes.</Text>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Current</Text>
          <Text style={styles.currentValue}>{currentDuration ? `${currentDuration} min` : "—"}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>New</Text>
          <TextInput
            value={nextDuration}
            onChangeText={setNextDuration}
            style={styles.input}
            keyboardType="number-pad"
            accessibilityLabel="New workout duration"
            placeholder="Minutes"
          />
        </View>
        <Pressable
          onPress={async () => {
            const value = Number(nextDuration);
            if (!Number.isFinite(value) || value <= 0 || value >= 1000) {
              Alert.alert("Invalid duration", "Enter a value between 1 and 999 minutes.");
              return;
            }
            if (!workoutId) return;
            setSaving(true);
            await saveOverride(workoutId, { correctedDurationMinutes: Math.round(value) });
            setSaving(false);
            router.back();
          }}
          style={[styles.primaryBtn, saving && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Save"
          disabled={saving}
        >
          <Text style={styles.primaryText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancel">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: UI_SCREEN_BG },
  title: { fontSize: 30, fontWeight: "800", color: "#1C1C1E" },
  description: { marginTop: 6, fontSize: 14, color: "#6E6E73", marginBottom: 16 },
  card: { backgroundColor: UI_CARD_SURFACE, borderRadius: 12, padding: 16 },
  sectionLabel: { fontSize: 13, color: "#8E8E93", marginBottom: 6, fontWeight: "600" },
  currentValue: { fontSize: 17, color: "#1C1C1E", fontWeight: "500", marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#D1D1D6", marginBottom: 12 },
  input: { backgroundColor: UI_SCREEN_BG, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: "#1C1C1E" },
  primaryBtn: { marginTop: 16, backgroundColor: SYSTEM_ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 16, color: "#6E6E73", fontWeight: "600" },
});
