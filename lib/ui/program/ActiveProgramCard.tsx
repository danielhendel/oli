// lib/ui/program/ActiveProgramCard.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { ProgramSummary } from "@/lib/data/program/types";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_14 } from "@/lib/ui/theme/systemAccent";

export type ActiveProgramCardProps = {
  /** The active program, or null to render the placeholder + Create CTA. */
  program: ProgramSummary | null;
  /** Whether the Create Program action is available. False renders an accessible "coming soon" CTA. */
  createEnabled?: boolean;
  onCreate?: () => void;
};

export function ActiveProgramCard({
  program,
  createEnabled = false,
  onCreate,
}: ActiveProgramCardProps): React.ReactElement {
  if (program) {
    return (
      <View style={styles.card} accessibilityLabel={`Active program, ${program.name}`}>
        <Text style={styles.eyebrow}>ACTIVE PROGRAM</Text>
        <Text style={styles.activeName}>{program.name}</Text>
      </View>
    );
  }

  const ctaLabel = "Create Program";
  const ctaAccessibilityLabel = createEnabled
    ? "Create Program"
    : "Create Program. Coming soon";

  return (
    <View style={styles.card} accessibilityLabel="Active program. No active program yet">
      <Text style={styles.eyebrow}>ACTIVE PROGRAM</Text>

      <View style={styles.placeholderRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="rocket-outline" size={22} color={SYSTEM_ACCENT} />
        </View>
        <View style={styles.placeholderText}>
          <Text style={styles.placeholderTitle}>No active program</Text>
          <Text style={styles.placeholderBody}>
            Build a complete plan across workouts, cardio, nutrition, and recovery.
          </Text>
        </View>
      </View>

      <Pressable
        testID="program-create-cta"
        onPress={() => {
          if (createEnabled) onCreate?.();
        }}
        disabled={!createEnabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !createEnabled }}
        accessibilityLabel={ctaAccessibilityLabel}
        hitSlop={6}
        style={({ pressed }) => [
          styles.cta,
          !createEnabled && styles.ctaDisabled,
          pressed && createEnabled && styles.ctaPressed,
        ]}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        {!createEnabled ? <Text style={styles.ctaHint}>Coming soon</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    padding: 16,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: UI_TEXT_SECONDARY,
  },
  activeName: {
    fontSize: 22,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  placeholderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SYSTEM_ACCENT_FILL_14,
  },
  placeholderText: {
    flex: 1,
    gap: 4,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  placeholderBody: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  cta: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    gap: 2,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaHint: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.85,
  },
});
