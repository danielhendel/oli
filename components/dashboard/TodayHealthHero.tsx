import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TodayHealthHeroViewModel } from "@/lib/dashboard/todayHealthHero";

import { UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";

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
        ) : (
          <Text style={styles.greeting} maxFontSizeMultiplier={1.35}>
            {headline}
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
  greeting: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.35,
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  skLineLong: {
    height: 28,
    borderRadius: 8,
    width: "72%",
    maxWidth: 280,
    backgroundColor: "rgba(140, 150, 170, 0.2)",
  },
});
