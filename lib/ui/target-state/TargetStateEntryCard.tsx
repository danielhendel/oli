// lib/ui/target-state/TargetStateEntryCard.tsx
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

export type TargetStateEntryCardProps = {
  dataCoveragePercent: number | null;
  targetStateConfidence: string | null;
  onPress: () => void;
};

export function TargetStateEntryCard({
  dataCoveragePercent,
  targetStateConfidence,
  onPress,
}: TargetStateEntryCardProps): React.ReactElement {
  const statusLabel =
    dataCoveragePercent != null
      ? `${dataCoveragePercent}% classification coverage`
      : "Evidence-based progression roadmap";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Target State. ${statusLabel}. View Target State`}
      testID="target-state-entry-card"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="map-outline" size={22} color={SYSTEM_ACCENT} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Target State</Text>
        <Text style={styles.subtitle}>
          See your evidence-based roadmap from current classification toward optimal health.
        </Text>
        <Text style={styles.status}>
          {targetStateConfidence != null
            ? `${statusLabel} · ${targetStateConfidence} confidence`
            : statusLabel}
        </Text>
      </View>
      <View style={styles.ctaWrap}>
        <Text style={styles.cta}>View Target State</Text>
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
