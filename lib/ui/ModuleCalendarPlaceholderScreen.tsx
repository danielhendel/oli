import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import { useModuleCalendarYearNavigationHeader } from "@/lib/ui/calendar/useModuleCalendarYearNavigationHeader";
import { UI_APP_SCREEN_BG } from "@/lib/ui/theme/uiTokens";

export type ModuleCalendarPlaceholderScreenProps = {
  title: string;
  description: string;
};

/** Placeholder until module-specific sleep/readiness calendar UX is defined (no data hooks). */
export function ModuleCalendarPlaceholderScreen({ title, description }: ModuleCalendarPlaceholderScreenProps) {
  const navigation = useNavigation();
  const headerYear = useMemo(() => Number(getTodayDayKeyLocal().slice(0, 4)), []);

  useModuleCalendarYearNavigationHeader(navigation, headerYear);

  return (
    <ScreenContainer backgroundColor={UI_APP_SCREEN_BG}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.bodyText}>{description}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingTop: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#3C3C43",
  },
});
