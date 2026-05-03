import React, { forwardRef, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_BORDER_SUBTLE, UI_NAV_ICON_ACTIVE, UI_SURFACE_ELEVATED } from "@/lib/ui/theme/uiTokens";

export type ManageFabProps = {
  onPress: () => void;
  /** When true, icon rotates slightly (menu open). */
  open?: boolean;
  testID?: string;
};

export const ManageFab = forwardRef<View, ManageFabProps>(function ManageFab(
  { onPress, open = false, testID = "oli-manage-fab" },
  ref,
) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotate, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [open, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const scale = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });

  return (
    <View ref={ref} collapsable={false} style={styles.wrap} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Open Manage menu"
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }, { scale }] }}>
          <Ionicons name="apps" size={28} color={UI_NAV_ICON_ACTIVE} />
        </Animated.View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: UI_SURFACE_ELEVATED,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
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
  fabPressed: {
    opacity: 0.92,
  },
});
