import React, { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useNutritionAnalyticsDetailScreenData } from "@/lib/hooks/useNutritionAnalyticsDetailScreenData";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { NUTRITION_SCREEN_CONTENT_BG } from "@/lib/ui/nutrition/nutritionOverviewTheme";

export default function NutritionAnalyticsDetailScreen() {
  const navigation = useNavigation();
  const { user, initializing } = useAuth();
  const { summary, eventsReady, error, requestId, refetch } = useNutritionAnalyticsDetailScreenData();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      title: "Nutrition analytics",
    });
  }, [navigation]);

  if (initializing) {
    return (
      <View style={styles.page}>
        <LoadingState message="Loading…" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.page}>
        <EmptyState title="Sign in required" description="Sign in to view nutrition analytics." />
      </View>
    );
  }

  if (error != null) {
    return (
      <View style={styles.page}>
        <ErrorState message={error} requestId={requestId} onRetry={() => void refetch()} />
      </View>
    );
  }

  if (!eventsReady || summary == null) {
    return (
      <View style={styles.page}>
        <LoadingState message="Loading analytics…" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>
        Last 90 days — canonical nutrition events and logging coverage (meal-level analytics come later).
      </Text>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Total logs</Text>
        <Text style={styles.metricValue}>{summary.totalEvents}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Days with nutrition</Text>
        <Text style={styles.metricValue}>{summary.activeDays}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Avg logs / active day</Text>
        <Text style={styles.metricValue}>
          {summary.activeDays > 0 ? summary.avgEventsPerActiveDay.toFixed(1) : "—"}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.metricLabel}>Range</Text>
        <Text style={styles.rangeValue}>
          {summary.rangeStart} → {summary.rangeEnd}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
    justifyContent: "center",
    padding: 16,
  },
  scroll: {
    flex: 1,
    backgroundColor: NUTRITION_SCREEN_CONTENT_BG,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: "#636366",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1C1E",
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});
