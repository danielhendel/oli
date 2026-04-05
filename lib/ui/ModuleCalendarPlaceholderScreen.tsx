import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";

import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";

export type ModuleCalendarPlaceholderScreenProps = {
  title: string;
  description: string;
};

/** Placeholder until module-specific sleep/readiness calendar UX is defined (no data hooks). */
export function ModuleCalendarPlaceholderScreen({ title, description }: ModuleCalendarPlaceholderScreenProps) {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ScreenContainer>
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
