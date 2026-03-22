import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { formatWorkoutTypeLabel } from "@/lib/data/workouts/workoutDisplay";
import { type WorkoutOverrideType, useWorkoutOverrides } from "@/lib/data/workouts/workoutOverrides";

export default function EditWorkoutTypeScreen() {
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
    currentWorkoutType?: string;
  }>();
  const workoutId = typeof params.workoutId === "string" ? params.workoutId : "";
  const currentTypeParam = typeof params.currentWorkoutType === "string" ? params.currentWorkoutType : "other";
  const currentType: WorkoutOverrideType =
    currentTypeParam === "strength" || currentTypeParam === "cardio" || currentTypeParam === "other"
      ? currentTypeParam
      : "other";
  const [nextType, setNextType] = useState<WorkoutOverrideType>(currentType);
  const [saving, setSaving] = useState(false);
  const { saveOverride } = useWorkoutOverrides(useMemo(() => (workoutId ? [workoutId] : []), [workoutId]));

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <Text style={styles.title}>Edit workout type</Text>
        <Text style={styles.description}>Choose the type that best matches this session.</Text>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Current</Text>
          <Text style={styles.currentValue}>{formatWorkoutTypeLabel(currentType)}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>New</Text>
          {(["strength", "cardio", "other"] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setNextType(type)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${formatWorkoutTypeLabel(type)}`}
              style={styles.optionRow}
            >
              <Text style={styles.optionLabel}>{formatWorkoutTypeLabel(type)}</Text>
              <Text style={styles.check}>{nextType === type ? "✓" : ""}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={async () => {
            if (!workoutId) return;
            setSaving(true);
            await saveOverride(workoutId, { correctedWorkoutType: nextType });
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
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D1D1D6",
  },
  optionLabel: { fontSize: 17, color: "#1C1C1E" },
  check: { fontSize: 18, color: "#007AFF", fontWeight: "700", width: 20, textAlign: "right" },
  primaryBtn: { marginTop: 16, backgroundColor: "#007AFF", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  disabled: { opacity: 0.6 },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 12 },
  cancelText: { fontSize: 16, color: "#6E6E73", fontWeight: "600" },
});
