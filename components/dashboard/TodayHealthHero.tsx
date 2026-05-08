import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SleepRecoverySummary } from "@/components/dashboard/SleepRecoverySummary";
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
    return vm.loading ? "Loading greeting" : `${headline}. ${vm.dateLine}.`;
  }, [vm.loading, headline, vm.dateLine]);

  return (
    <View style={styles.wrap} testID="today-health-hero">
      <View accessible accessibilityRole="header" accessibilityLabel={headerA11y}>
        {vm.loading ? (
          <>
            <View style={styles.skLineLong} />
            <View style={styles.skLineShort} />
          </>
        ) : (
          <>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.35}>
              {headline}
            </Text>
            <Text style={styles.dateLine} maxFontSizeMultiplier={1.35}>
              {vm.dateLine}
            </Text>
          </>
        )}
      </View>

      <SleepRecoverySummary model={vm.sleepRecovery} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "600",
    letterSpacing: -0.35,
    color: UI_TEXT_PRIMARY,
  },
  dateLine: {
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    marginTop: 4,
  },
  skLineLong: {
    height: 28,
    borderRadius: 8,
    width: "72%",
    backgroundColor: "rgba(140, 150, 170, 0.2)",
  },
  skLineShort: {
    marginTop: 10,
    height: 16,
    borderRadius: 8,
    width: "48%",
    backgroundColor: "rgba(140, 150, 170, 0.16)",
  },
});
