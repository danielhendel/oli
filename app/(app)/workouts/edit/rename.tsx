import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export default function EditWorkoutRenameScreen() {
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
    currentTitle?: string;
  }>();
  const workoutId = typeof params.workoutId === "string" ? params.workoutId : "";
  const currentTitle = typeof params.currentTitle === "string" ? params.currentTitle : "Workout";
  const [nextTitle, setNextTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);
  const { saveOverride } = useWorkoutOverrides(useMemo(() => (workoutId ? [workoutId] : []), [workoutId]));

  if (!workoutId) {
    return (
      <ScreenContainer>
        <View style={styles.root}>
          <Text style={styles.title}>Rename workout</Text>
          <Text style={styles.description}>Missing workout id.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <Text style={styles.title}>Rename workout</Text>
        <Text style={styles.description}>Change the displayed workout name while keeping source data intact.</Text>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Current</Text>
          <Text style={styles.currentValue}>{currentTitle}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>New</Text>
          <TextInput
            value={nextTitle}
            onChangeText={setNextTitle}
            style={styles.input}
            accessibilityLabel="New workout name"
            placeholder="Workout name"
          />
        </View>
        <Pressable
          onPress={async () => {
            const trimmed = nextTitle.trim();
            if (!trimmed) {
              Alert.alert("Invalid name", "Please enter a workout name.");
              return;
            }
            setSaving(true);
            await saveOverride(workoutId, { customTitle: trimmed });
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
  root: { flex: 1, paddingTop: 24, paddingHorizontal: 16, backgroundColor: "#F2F2F7" },
  title: { fontSize: 30, fontWeight: "800", color: "#1C1C1E" },
  description: { marginTop: 6, fontSize: 14, color: "#6E6E73", marginBottom: 16 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16 },
  sectionLabel: { fontSize: 13, color: "#8E8E93", marginBottom: 6, fontWeight: "600" },
  currentValue: { fontSize: 17, color: "#1C1C1E", fontWeight: "500", marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#D1D1D6", marginBottom: 12 },
  input: { backgroundColor: "#F2F2F7", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: "#1C1C1E" },
  primaryBtn: { marginTop: 16, backgroundColor: SYSTEM_ACCENT, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 16, color: "#6E6E73", fontWeight: "600" },
});
