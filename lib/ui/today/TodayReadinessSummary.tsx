import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TodayCommandModel } from "@/lib/today/types";
import { UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  readiness: TodayCommandModel["readiness"];
  loading?: boolean;
};

export function TodayReadinessSummary({ readiness, loading }: Props): React.ReactElement {
  if (loading) {
    return (
      <View style={styles.wrap} testID="today-readiness-loading">
        <View style={styles.skLine} />
      </View>
    );
  }

  return (
    <Text
      style={styles.text}
      maxFontSizeMultiplier={1.3}
      accessibilityRole="text"
      accessibilityLabel={readiness.headline}
      testID="today-readiness-summary"
    >
      {readiness.headline}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  skLine: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(140, 150, 170, 0.16)",
    alignSelf: "stretch",
  },
});
