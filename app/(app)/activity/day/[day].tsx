import React, { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation, usePathname } from "expo-router";

import { activityDayKeyFromActivityDayPathname } from "@/lib/data/activity/activityDayRouteParam";
import { useActivityDayScreenData } from "@/lib/data/activity/useActivityDayScreenData";
import { useAuth } from "@/lib/auth/AuthProvider";
import { formatDayKeyStackNavTitle } from "@/lib/ui/calendar/dayKeyDisplayFormat";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import { workoutsStackNavigationOptions } from "@/lib/ui/headers/workoutsStackHeader";
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
export default function ActivityDayScreen() {
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const rawDayParam = activityDayKeyFromActivityDayPathname(pathname) ?? params.day;
  const { normalized, state, reload } = useActivityDayScreenData(rawDayParam);
  const { user, initializing } = useAuth();

  useLayoutEffect(() => {
    if (!normalized.ok) {
      navigation.setOptions({
        ...workoutsStackNavigationOptions("detail"),
        title: "Activity",
        headerTitleAlign: "center",
        headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
      });
      return;
    }
    navigation.setOptions({
      ...workoutsStackNavigationOptions("detail"),
      title: formatDayKeyStackNavTitle(normalized.day),
      headerTitleAlign: "center",
      headerLeft: () => <HeaderBackButton onPress={() => navigation.goBack()} />,
    });
  }, [navigation, normalized]);

  if (!normalized.ok) {
    return (
      <ScreenContainer>
        <ErrorState message="That date isn’t valid. Use a day in YYYY-MM-DD format." />
      </ScreenContainer>
    );
  }

  if (!user && !initializing) {
    return (
      <ScreenContainer>
        <EmptyState title="Sign in" description="Sign in to view steps for this day." />
      </ScreenContainer>
    );
  }

  if (initializing || state.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading steps…" />
      </ScreenContainer>
    );
  }

  if (state.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState
          message={state.message}
          requestId={state.requestId}
          onRetry={() => void reload()}
        />
      </ScreenContainer>
    );
  }

  if (state.status === "missing") {
    return (
      <ScreenContainer>
        <EmptyState
          title="No steps for this day"
          description="When Apple Health or other sources sync steps for this date, the total will appear here."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Steps</Text>
            <Text style={styles.value}>{state.steps.toLocaleString()}</Text>
          </View>
          <Text style={styles.caption}>Total from your daily rollup (same source as Activity overview).</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: UI_CARD_SURFACE, borderRadius: 12, padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 14, color: "#6E6E73" },
  value: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  caption: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
});
