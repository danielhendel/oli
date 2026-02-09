/**
 * Sprint 4 — Subtle, accessible truth indicators.
 *
 * Phase 2: incomplete, uncertain, corrected must be visible.
 * No prompts—indicators only.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export type TruthIndicatorProps = {
  type: "incomplete" | "uncertain" | "corrected";
  label?: string;
};

const CONFIG = {
  incomplete: { bg: "#FFF8E6", text: "#8B6914", defaultLabel: "incomplete" },
  uncertain: { bg: "#F5F0F9", text: "#6B4E99", defaultLabel: "uncertain" },
  corrected: { bg: "#F0F4FF", text: "#4A6FA5", defaultLabel: "corrected" },
} as const;

export function TruthIndicator({ type, label }: TruthIndicatorProps): React.ReactNode {
  const cfg = CONFIG[type];
  const displayLabel = label ?? cfg.defaultLabel;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.text }]} accessibilityLabel={displayLabel}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
