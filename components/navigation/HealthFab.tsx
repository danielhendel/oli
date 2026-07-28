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
import { HEALTH_NAV_ITEM } from "@/lib/navigation/primaryNavigationConfig";

/** Matches legacy Manage FAB circle diameter. */
export const HEALTH_FAB_CIRCLE_SIZE = 52;

export type HealthFabProps = {
  onPress: () => void;
  /** When true, menu is open (expanded). */
  open?: boolean;
  /** When true, Health-family route is active (selected without menu). */
  selected?: boolean;
  testID?: string;
};

/**
 * Detached Health control — same circular grammar as Manage FAB, with a visible
 * Health label so the control does not read as a fifth pill destination.
 */
export const HealthFab = forwardRef<View, HealthFabProps>(function HealthFab(
  {
    onPress,
    open = false,
    selected = false,
    testID = HEALTH_NAV_ITEM.testID,
  },
  ref,
) {
  const active = open || selected;
  const color = active ? UI_NAV_TAB_ICON_ACTIVE : UI_NAV_TAB_ICON_INACTIVE;
  const iconName = active ? HEALTH_NAV_ITEM.icon : HEALTH_NAV_ITEM.iconOutline;

  return (
    <View ref={ref} collapsable={false} style={styles.wrap} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={HEALTH_NAV_ITEM.accessibilityLabel}
        accessibilityHint={HEALTH_NAV_ITEM.accessibilityHint}
        accessibilityState={{ selected: active, expanded: open }}
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <View style={[styles.circle, active && styles.circleActive]}>
          <Ionicons name={iconName} size={24} color={color} />
        </View>
        <Text style={[styles.label, { color }]} numberOfLines={1}>
          {HEALTH_NAV_ITEM.label}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    alignItems: "center",
  },
  pressable: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: HEALTH_FAB_CIRCLE_SIZE,
    gap: 2,
  },
  pressed: {
    opacity: 0.92,
  },
  circle: {
    width: HEALTH_FAB_CIRCLE_SIZE,
    height: HEALTH_FAB_CIRCLE_SIZE,
    borderRadius: HEALTH_FAB_CIRCLE_SIZE / 2,
    backgroundColor: UI_NAV_DOCK_SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_NAV_SURFACE_BORDER,
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
  circleActive: {
    backgroundColor: UI_NAV_SURFACE_ACTIVE,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
