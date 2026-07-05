import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ManageMenuTriggerButton } from "@/components/navigation/ManageMenuTriggerButton";
import { UserInitialSettingsButton } from "@/lib/ui/UserInitialSettingsButton";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

const TITLE = "Oli Fitness";

export function DashScreenHeader(): React.ReactElement {
  return (
    <View style={styles.wrap} testID="dash-screen-header">
      <View style={styles.row}>
        <View style={styles.leftCluster}>
          <ManageMenuTriggerButton />
        </View>
        <View style={styles.titleLayer} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {TITLE}
          </Text>
        </View>
        <View style={styles.rightCluster}>
          <UserInitialSettingsButton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 16,
    paddingBottom: 12,
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
  leftCluster: {
    zIndex: 1,
    minWidth: 44,
    alignItems: "flex-start",
  },
  titleLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 96,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: 0.15,
    textAlign: "center",
  },
  rightCluster: {
    zIndex: 1,
    minWidth: 44,
    alignItems: "flex-end",
  },
});
