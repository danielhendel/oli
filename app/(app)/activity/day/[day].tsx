import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useActivityDayScreenData } from "@/lib/data/activity/useActivityDayScreenData";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EmptyState, ErrorState, LoadingState, ScreenContainer } from "@/lib/ui/ScreenStates";

export default function ActivityDayScreen() {
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const { normalized, state, reload } = useActivityDayScreenData(params.day);
  const { user, initializing } = useAuth();

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
          <Text style={styles.title}>{normalized.ok ? normalized.day : ""}</Text>
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
  card: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 14, color: "#6E6E73" },
  value: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  caption: { fontSize: 12, color: "#8E8E93", marginTop: 4 },
});
