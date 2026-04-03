import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

/** Uniform circular hit targets (center is not larger than sides). */
const SLOT = 52;
const DOCK_GAP = 34;
const ICON = 23;

const DOCK_BG = "rgba(255, 255, 255, 0.58)";

const DOCK_SHADOW =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000000",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
      }
    : { elevation: 4 };

const SLOT_SIDE_SHADOW =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      }
    : { elevation: 2 };

const SLOT_PRIMARY_SHADOW =
  Platform.OS === "ios"
    ? {
        shadowColor: "#000000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }
    : { elevation: 3 };

export type WorkoutsOverviewBottomNavProps = {
  /** Stack base for this product flow (`/(app)/workouts` = Strength, `/(app)/cardio` = Cardio). */
  basePath: "/(app)/workouts" | "/(app)/cardio";
};

/**
 * Single floating pill dock for training overview — plan, start log (primary), create.
 */
export function WorkoutsOverviewBottomNav({ basePath }: WorkoutsOverviewBottomNavProps) {
  const router = useRouter();

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={[styles.dock, DOCK_SHADOW]}>
        <Pressable
          onPress={() => router.push(`${basePath}/plan`)}
          style={({ pressed }) => [
            styles.slot,
            styles.slotSide,
            SLOT_SIDE_SHADOW,
            pressed && styles.slotSidePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Training plan"
        >
          <Ionicons name="reader-outline" size={ICON} color="#2C2C2E" />
        </Pressable>
        <Pressable
          onPress={() => router.push(`${basePath}/log`)}
          style={({ pressed }) => [
            styles.slot,
            styles.slotPrimary,
            SLOT_PRIMARY_SHADOW,
            pressed && styles.slotPrimaryPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Start workout log"
        >
          <Ionicons name="add" size={ICON} color="#FFFFFF" style={styles.addIcon} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`${basePath}/create`)}
          style={({ pressed }) => [
            styles.slot,
            styles.slotSide,
            SLOT_SIDE_SHADOW,
            pressed && styles.slotSidePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create workout"
        >
          <Ionicons name="create-outline" size={ICON} color="#2C2C2E" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 34,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DOCK_GAP,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 38,
    backgroundColor: DOCK_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(60, 60, 67, 0.09)",
    transform: [{ translateY: -6 }],
  },
  addIcon: {
    marginTop: -1,
  },
  slot: {
    width: SLOT,
    height: SLOT,
    borderRadius: SLOT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  slotSide: {
    backgroundColor: "#F2F2F7",
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.12)",
  },
  slotSidePressed: {
    backgroundColor: "#E8E8ED",
  },
  slotPrimary: {
    backgroundColor: SYSTEM_ACCENT,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  slotPrimaryPressed: {
    opacity: 0.9,
  },
});
