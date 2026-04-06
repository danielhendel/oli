// app/(app)/dash/daily-recap.tsx
// Placeholder — full Daily Recap experience will ship later.
import React, { useLayoutEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "expo-router";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";

export default function DailyRecapPlaceholderScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Daily Recap",
      headerBackButtonDisplayMode: "minimal",
      headerShadowVisible: false,
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation]);

  return (
    <ScreenContainer>
      <View style={styles.body}>
        <Text style={styles.title}>Coming soon</Text>
        <Text style={styles.copy}>
          A dedicated Daily Recap screen will open from here. For now, see your snapshot on the Dash tab.
        </Text>
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
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  copy: {
    fontSize: 16,
    color: "#6E6E73",
    lineHeight: 22,
  },
});
