// lib/ui/health-baseline/HealthBaselineEntryCard.tsx
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type HealthBaselineEntryCardProps = {
  dataCompleteness: number | null;
  baselineConfidence: string | null;
  onPress: () => void;
};

export function HealthBaselineEntryCard({
  dataCompleteness,
  baselineConfidence,
  onPress,
}: HealthBaselineEntryCardProps): React.ReactElement {
  const statusLabel =
    dataCompleteness != null
      ? `${dataCompleteness}% data coverage`
      : "View your measured baselines";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Health Baseline. ${statusLabel}. View Baseline`}
      testID="health-baseline-entry-card"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="analytics-outline" size={22} color={SYSTEM_ACCENT} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Health Baseline</Text>
        <Text style={styles.subtitle}>
          Understand your current health baselines across body composition, activity, fitness,
          nutrition, recovery, and labs.
        </Text>
        <Text style={styles.status}>
          {baselineConfidence != null
            ? `${statusLabel} · ${baselineConfidence} confidence`
            : statusLabel}
        </Text>
      </View>
      <View style={styles.ctaWrap}>
        <Text style={styles.cta}>View Baseline</Text>
        <Ionicons name="chevron-forward" size={18} color={SYSTEM_ACCENT} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardPressed: { opacity: 0.92 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(58, 91, 219, 0.12)",
  },
  textWrap: { flex: 1, gap: 4 },
  title: { fontSize: 17, fontWeight: "700", color: UI_TEXT_PRIMARY },
  subtitle: { fontSize: 14, lineHeight: 20, color: UI_TEXT_SECONDARY },
  status: { fontSize: 13, fontWeight: "600", color: SYSTEM_ACCENT, marginTop: 2 },
  ctaWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  cta: { fontSize: 14, fontWeight: "700", color: SYSTEM_ACCENT },
});
