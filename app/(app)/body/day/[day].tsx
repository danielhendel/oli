import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer, EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { useBodyCompositionData } from "@/lib/data/body/useBodyCompositionData";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  formatBodyBmi,
  formatBodyLeanMass,
  formatBodyRmr,
  formatBodyWeight,
} from "@/lib/ui/body/bodyMetricFormatting";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
export default function BodyDayScreen() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = typeof params.day === "string" ? params.day : "";
  const isDay = /^\d{4}-\d{2}-\d{2}$/.test(day);
  const body = useBodyCompositionData(isDay ? day : new Date().toISOString().slice(0, 10), "5Y");
  const { state: prefState } = usePreferences();
  const unit = prefState.preferences?.units?.mass ?? "lb";

  if (!isDay) {
    return (
      <ScreenContainer>
        <ErrorState message="Invalid day parameter" />
      </ScreenContainer>
    );
  }

  if (body.series.status === "partial") {
    return (
      <ScreenContainer>
        <LoadingState message="Loading body details…" />
      </ScreenContainer>
    );
  }

  if (body.series.status === "error") {
    return (
      <ScreenContainer>
        <ErrorState message={body.series.error} requestId={body.series.requestId} onRetry={() => body.series.refetch()} />
      </ScreenContainer>
    );
  }

  const entries = body.byDay.get(day) ?? [];
  const bodyFacts =
    body.dayFacts.status === "ready"
      ? body.dayFacts.data.body
      : null;

  if (entries.length === 0 && !bodyFacts) {
    return (
      <ScreenContainer>
        <EmptyState title="No data for this day" description="When body measurements exist for this date, they will appear here." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>{day}</Text>
          {bodyFacts?.weightKg != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Weight</Text>
              <Text style={styles.value}>{formatBodyWeight(bodyFacts.weightKg, unit)}</Text>
            </View>
          ) : null}
          {bodyFacts?.bmi != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>BMI</Text>
              <Text style={styles.value}>{formatBodyBmi(bodyFacts.bmi)}</Text>
            </View>
          ) : null}
          {bodyFacts?.bodyFatPercent != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Body Fat</Text>
              <Text style={styles.value}>{bodyFacts.bodyFatPercent.toFixed(1)}%</Text>
            </View>
          ) : null}
          {bodyFacts?.leanBodyMassKg != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Lean Body Mass</Text>
              <Text style={styles.value}>{formatBodyLeanMass(bodyFacts.leanBodyMassKg, unit)}</Text>
            </View>
          ) : null}
          {bodyFacts?.restingMetabolicRateKcal != null ? (
            <View style={styles.row}>
              <Text style={styles.label}>RMR</Text>
              <Text style={styles.value}>{formatBodyRmr(bodyFacts.restingMetabolicRateKcal)}</Text>
            </View>
          ) : null}
          {entries.map((entry) => (
            <View key={entry.observedAt} style={styles.row}>
              <Text style={styles.label}>{new Date(entry.observedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
              <Text style={styles.value}>{formatBodyWeight(entry.weightKg, unit)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: UI_CARD_SURFACE, borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#1C1C1E", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 14, color: "#6E6E73" },
  value: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
});

