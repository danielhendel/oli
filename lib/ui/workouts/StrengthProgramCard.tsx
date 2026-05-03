import React, { type ReactElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";
import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { PrimaryActionBarShell } from "@/lib/ui/workouts/PrimaryActionBarShell";
import {
  PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL,
  programPrimaryCtaBarStyles,
} from "@/lib/ui/workouts/programPrimaryCtaBarStyles";
import { logShellLayoutAudit } from "@/lib/ui/workouts/shellLayoutAudit";

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
        style={({ pressed }) => [styles.ctaPressableWrap, pressed && programPrimaryCtaBarStyles.ctaPressed]}
        testID="strength-program-card-create"
        onLayout={(e) => logShellLayoutAudit("create-program-pressable-wrap", e)}
      >
        <PrimaryActionBarShell layout="center">
          <Text style={programPrimaryCtaBarStyles.ctaBarLabel} numberOfLines={1} ellipsizeMode="tail">
            Create Program
          </Text>
        </PrimaryActionBarShell>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: PRIMARY_TRAINING_CARD_PADDING_HORIZONTAL,
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
  /** Pressable wraps {@link PrimaryActionBarShell}; shell owns blue metrics (parity with This Week). */
  ctaPressableWrap: {
    alignSelf: "stretch",
  },
});
