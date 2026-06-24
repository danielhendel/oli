// lib/ui/health-assessment/HealthAssessmentEntryCard.tsx
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

export type HealthAssessmentEntryCardProps = {
  hasProgress: boolean;
  completionPercent: number;
  onPress: () => void;
};

export function HealthAssessmentEntryCard({
  hasProgress,
  completionPercent,
  onPress,
}: HealthAssessmentEntryCardProps): React.ReactElement {
  const ctaLabel = hasProgress ? "Continue" : "Start Assessment";
  const statusLabel =
    hasProgress && completionPercent > 0
      ? `${completionPercent}% complete`
      : "Not started";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Health Assessment. ${statusLabel}. ${ctaLabel}`}
      testID="health-assessment-entry-card"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="clipboard-outline" size={22} color={SYSTEM_ACCENT} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Health Assessment</Text>
        <Text style={styles.subtitle}>
          Build your current state profile so Oli can personalize your health plan.
        </Text>
        <Text style={styles.status}>{statusLabel}</Text>
      </View>
      <View style={styles.ctaWrap}>
        <Text style={styles.cta}>{ctaLabel}</Text>
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
  cardPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(58, 91, 219, 0.12)",
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
    marginTop: 2,
  },
  ctaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  cta: {
    fontSize: 14,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
  },
});
