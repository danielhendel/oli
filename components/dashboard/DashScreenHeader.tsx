import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { UserInitialSettingsButton } from "@/lib/ui/UserInitialSettingsButton";
import { CONSUMER_HOME_LABEL } from "@/lib/navigation/consumerHome";
import {
  UI_APP_SCREEN_BG,
  UI_TAB_ROOT_INSET,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

const DEFAULT_TITLE = CONSUMER_HOME_LABEL;

export type DashScreenHeaderProps = {
  /** Consumer screen title. Defaults to Home. */
  title?: string;
  /** Optional subtitle under the title. Daily Monitor keeps date in page content instead. */
  dateLabel?: string | null;
  /** Combined accessibility label for title (+ date when present). */
  accessibilityLabel?: string;
};

export function DashScreenHeader({
  title = DEFAULT_TITLE,
  dateLabel = null,
  accessibilityLabel,
}: DashScreenHeaderProps = {}): React.ReactElement {
  const a11y =
    accessibilityLabel ??
    (dateLabel != null && dateLabel.length > 0 ? `${title}. ${dateLabel}` : title);

  return (
    <View style={styles.wrap} testID="dash-screen-header" accessibilityLabel={a11y}>
      <View style={styles.row}>
        <View style={styles.leftCluster} />
        <View style={styles.titleLayer} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {dateLabel != null && dateLabel.length > 0 ? (
            <Text style={styles.dateLabel} numberOfLines={1} accessibilityRole="text">
              {dateLabel}
            </Text>
          ) : null}
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
  dateLabel: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    textAlign: "center",
  },
  rightCluster: {
    zIndex: 1,
    minWidth: 44,
    alignItems: "flex-end",
  },
});
