import React, { type ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  SYSTEM_ACCENT,
  SYSTEM_ACCENT_FILL_14,
} from "@/lib/ui/theme/systemAccent";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type StrengthProgramCardProps = {
  onCreateProgram: () => void;
  testID?: string;
};

const BODY_COPY =
  "Create a structured plan to track progress, progressive overload, and consistency.";

const CTA_A11Y_LABEL = "Create program";

export function StrengthProgramCard({
  onCreateProgram,
  testID = "strength-program-card",
}: StrengthProgramCardProps): ReactElement {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>Program</Text>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>Setup</Text>
        </View>
      </View>

      <Text style={styles.headline} accessibilityRole="header">
        No Active Program
      </Text>

      <Text style={styles.body}>{BODY_COPY}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={CTA_A11Y_LABEL}
        onPress={onCreateProgram}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        testID="strength-program-card-create"
      >
        <Text style={styles.ctaLabel}>Create Program</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    alignSelf: "center",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.06,
    color: SYSTEM_ACCENT,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.28,
    lineHeight: 21,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.1,
    lineHeight: 21,
  },
  cta: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
