/**
 * Cardio Analytics — yearly total cardio miles by month (matches Strength analytics-detail presentation).
 */

import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useCardioAnalyticsDetailScreenData } from "@/lib/hooks/useCardioAnalyticsDetailScreenData";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { CardioMilesAnalyticsCard } from "@/lib/ui/workouts/CardioMilesAnalyticsCard";
import { EmptyState, LoadingState } from "@/lib/ui/ScreenStates";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";

export default function CardioAnalyticsDetailScreen() {
  const navigation = useNavigation();
  const { user, initializing } = useAuth();
  const { model, calendarReady } = useCardioAnalyticsDetailScreenData(user?.uid);

  useEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} accessibilityLabel="Go back" />,
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
        <EmptyState title="Sign in" description="Sign in to view cardio analytics." />
      </View>
    );
  }

  if (!calendarReady || model == null) {
    return (
      <View style={styles.body}>
        <LoadingState message="Loading workouts…" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      testID="cardio-analytics-detail-scroll"
    >
      <CardioMilesAnalyticsCard model={model} />
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
