import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TodayHealthHeroViewModel } from "@/lib/dashboard/todayHealthHero";

import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

type Props = {
  vm: TodayHealthHeroViewModel;
};

export function TodayHealthHero({ vm }: Props): React.ReactElement {
  const headline = useMemo(() => {
    const base = vm.greetingPhrase;
    return vm.firstName ? `${base}, ${vm.firstName}` : base;
  }, [vm.firstName, vm.greetingPhrase]);

  const headerA11y = useMemo(() => {
    return vm.loading ? "Loading greeting" : headline;
  }, [vm.loading, headline]);

  return (
    <View style={styles.wrap} testID="today-health-hero">
      <View style={styles.headerBlock} accessible accessibilityRole="header" accessibilityLabel={headerA11y}>
        {vm.loading ? (
          <View style={styles.skLineLong} />
        ) : vm.firstName ? (
          <Text style={styles.greetingLine} maxFontSizeMultiplier={1.35}>
            <Text style={styles.greetingPhrase}>{vm.greetingPhrase}, </Text>
            <Text style={styles.greetingName}>{vm.firstName}</Text>
          </Text>
        ) : (
          <Text style={[styles.greetingLine, styles.greetingName]} maxFontSizeMultiplier={1.35}>
            {vm.greetingPhrase}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 14,
    paddingBottom: 20,
    alignItems: "center",
  },
  headerBlock: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  greetingLine: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
  },
  greetingPhrase: {
    fontWeight: "500",
    letterSpacing: -0.25,
    color: UI_TEXT_SECONDARY,
  },
  greetingName: {
    fontWeight: "600",
    letterSpacing: -0.45,
    color: UI_TEXT_PRIMARY,
  },
  skLineLong: {
    height: 28,
    borderRadius: 8,
    width: "72%",
    maxWidth: 280,
    backgroundColor: "rgba(140, 150, 170, 0.2)",
  },
});
