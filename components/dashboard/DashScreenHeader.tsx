import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ManageMenuTriggerButton } from "@/components/navigation/ManageMenuTriggerButton";
import { UserInitialSettingsButton } from "@/lib/ui/UserInitialSettingsButton";
import { UI_APP_SCREEN_BG, UI_TAB_ROOT_INSET, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

const TITLE = "Oli Fitness";
const RIGHT_CLUSTER_GAP = 4;

export function DashScreenHeader(): React.ReactElement {
  return (
    <View style={styles.wrap} testID="dash-screen-header">
      <View style={styles.row}>
        <View style={styles.titleLayer} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {TITLE}
          </Text>
        </View>
        <View style={styles.rightCluster}>
          <UserInitialSettingsButton />
          <ManageMenuTriggerButton />
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
    justifyContent: "center",
    position: "relative",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: RIGHT_CLUSTER_GAP,
    marginLeft: "auto",
    zIndex: 1,
  },
});
