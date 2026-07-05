import React from "react";
import { Pressable, StyleSheet, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { manageHubIconName } from "@/lib/ui/navigation/manageHubIcons";
import { UI_NAV_DOCK_SURFACE, UI_NAV_ICON_ACTIVE, UI_NAV_SURFACE_BORDER } from "@/lib/ui/theme/uiTokens";

const PROFILE_ICON = manageHubIconName("profile");

export type ProfileShortcutFabProps = {
  onPress: () => void;
  testID?: string;
};

export function ProfileShortcutFab({
  onPress,
  testID = "oli-profile-fab",
}: ProfileShortcutFabProps) {
  return (
    <View collapsable={false} style={styles.wrap} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        accessibilityHint="Opens your health profile"
        onPress={onPress}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons
          testID={`${testID}-icon`}
          name={PROFILE_ICON}
          size={28}
          color={UI_NAV_ICON_ACTIVE}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  fabPressed: {
    opacity: 0.92,
  },
});
