import React, { forwardRef } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  UI_NAV_DOCK_SURFACE,
  UI_NAV_SURFACE_ACTIVE,
  UI_NAV_SURFACE_BORDER,
  UI_NAV_TAB_ICON_ACTIVE,
  UI_NAV_TAB_ICON_INACTIVE,
} from "@/lib/ui/theme/uiTokens";

/**
 * Detached Health control height — matches the primary pill min height
 * (`TAB_MIN_HEIGHT + 12` = 56) so dock row bottoms align.
 */
export const HEALTH_FAB_MIN_HEIGHT = 56;

/** Minimum width so “Health” fits inside the control without clipping. */
export const HEALTH_FAB_MIN_WIDTH = 56;

/** @deprecated Prefer {@link HEALTH_FAB_MIN_HEIGHT}; kept for prior test imports. */
export const HEALTH_FAB_CIRCLE_SIZE = HEALTH_FAB_MIN_HEIGHT;

export type HealthFabProps = {
  onPress: () => void;
  /** When true, menu is open (expanded). */
  open?: boolean;
  /** When true, Health-family route is active (selected without menu). */
  selected?: boolean;
  testID?: string;
};

/**
 * Detached Health control — Option A rounded vertical capsule.
 * Icon + visible “Health” label are both inside one pressable surface so the
 * label cannot hang below the dock chrome.
 */
export const HealthFab = forwardRef<View, HealthFabProps>(function HealthFab(
  {
    onPress,
    open = false,
    selected = false,
    testID = "oli-health-fab",
  },
  ref,
) {
  const active = open || selected;
  const color = active ? UI_NAV_TAB_ICON_ACTIVE : UI_NAV_TAB_ICON_INACTIVE;
  const iconName = active ? "heart" : "heart-outline";

  return (
    <View ref={ref} collapsable={false} style={styles.wrap} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Health"
        accessibilityHint="Opens the Health menu"
        accessibilityState={{ selected: active, expanded: open }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.control,
          active && styles.controlActive,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.iconWrap} testID="oli-health-fab-icon" accessibilityElementsHidden>
          <Ionicons name={iconName} size={22} color={color} />
        </View>
        <Text
          style={[styles.label, { color }]}
          numberOfLines={1}
          testID="oli-health-fab-label"
        >
          Health
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Single self-contained surface — icon + label live inside this pressable. */
  control: {
    minWidth: HEALTH_FAB_MIN_WIDTH,
    minHeight: HEALTH_FAB_MIN_HEIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: UI_NAV_DOCK_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_NAV_SURFACE_BORDER,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
  controlActive: {
    backgroundColor: UI_NAV_SURFACE_ACTIVE,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: -0.1,
    lineHeight: 12,
  },
});
