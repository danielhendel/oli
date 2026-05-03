/**
 * Activity Analytics — yearly average steps/day by month (matches Strength Analytics presentation).
 */

import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useActivityAnalyticsScreenData } from "@/lib/data/activity/useActivityAnalyticsScreenData";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { ActivityStepsAnalyticsCard } from "@/lib/ui/activity/ActivityStepsAnalyticsCard";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";

export default function ActivityAnalyticsScreen() {
  const navigation = useNavigation();
  const { user, initializing, rollupStatus, model } = useActivityAnalyticsScreenData();

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
      title: "",
      headerTitle: "",
      headerStyle: {
        backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        shadowOffset: { width: 0, height: 0 },
      },
      headerShadowVisible: false,
    });
  }, [navigation]);

  if (initializing) {
    return (
      <View style={styles.body}>
        <LoadingState message="Loading…" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.body}>
        <EmptyState title="Sign in" description="Sign in to view activity analytics." />
      </View>
    );
  }

  if (rollupStatus === "partial") {
    return (
      <View style={styles.body}>
        <LoadingState message="Loading steps…" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      testID="activity-analytics-scroll"
    >
      <ActivityStepsAnalyticsCard model={model} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  scroll: { flex: 1, backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
});
