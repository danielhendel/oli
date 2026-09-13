// lib/ui/navigation/AppHeader.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { UserInitialSettingsButton } from "@/lib/ui/UserInitialSettingsButton";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

export type AppHeaderProps = {
  title: string;
  accessibilityLabel?: string;
  showMenuButton?: boolean;
  onMenuPress?: () => void;
};

/**
 * Compact primary-tab header: optional hamburger · centered title · avatar.
 */
export function AppHeader({
  title,
  accessibilityLabel,
  showMenuButton = true,
  onMenuPress,
}: AppHeaderProps): React.ReactElement {
  const a11y = accessibilityLabel ?? title;

  return (
    <View style={styles.wrap} testID="app-header" accessibilityLabel={a11y}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showMenuButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              accessibilityHint="Shows app navigation"
              onPress={onMenuPress}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.iconPressed : null]}
              hitSlop={8}
              testID="app-header-menu-button"
            >
              <Ionicons name="menu-outline" size={24} color={UI_TEXT_PRIMARY} />
            </Pressable>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>

        <View style={styles.titleLayer} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>

        <View style={[styles.side, styles.sideRight]}>
          <UserInitialSettingsButton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: UI_TAB_ROOT_INSET,
    backgroundColor: UI_APP_SCREEN_BG,
  },
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  side: {
    zIndex: 1,
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  titleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 96,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  iconPressed: {
    opacity: 0.7,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
});

/** @deprecated Prefer AppHeader. Kept for LegacyDashHost transitional use. */
export { AppHeader as DashScreenHeaderCompact };
