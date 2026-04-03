import React from "react";
import { NUTRITION_ACCENT } from "@/lib/ui/nutrition/nutritionOverviewTheme";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";

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

const BASE = "/(app)/nutrition" as const;

/**
 * Nutrition overview dock — targets (plan), log (primary), analytics.
 * No `create` route exists in-repo for nutrition (food library deferred).
 */
export function NutritionOverviewBottomNav() {
  const router = useRouter();

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={[styles.dock, DOCK_SHADOW]}>
        <Pressable
          onPress={() => router.push(`${BASE}/targets`)}
          style={({ pressed }) => [
            styles.slot,
            styles.slotSide,
            SLOT_SIDE_SHADOW,
            pressed && styles.slotSidePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Nutrition targets"
        >
          <Ionicons name="restaurant-outline" size={ICON} color="#2C2C2E" />
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({
              pathname: `${BASE}/log`,
              params: { day: getTodayDayKeyLocal() },
            })
          }
          style={({ pressed }) => [
            styles.slot,
            styles.slotPrimary,
            SLOT_PRIMARY_SHADOW,
            pressed && styles.slotPrimaryPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Log nutrition"
        >
          <Ionicons name="add" size={ICON} color="#FFFFFF" style={styles.addIcon} />
        </Pressable>
        <Pressable
          onPress={() => router.push(`${BASE}/analytics-detail`)}
          style={({ pressed }) => [
            styles.slot,
            styles.slotSide,
            SLOT_SIDE_SHADOW,
            pressed && styles.slotSidePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Nutrition analytics"
        >
          <Ionicons name="stats-chart-outline" size={ICON} color="#2C2C2E" />
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
    backgroundColor: NUTRITION_ACCENT,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  slotPrimaryPressed: {
    opacity: 0.9,
  },
});
