// Compact zone label beside metric title (Body Composition overview).
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { InterpretationBarModel, InterpretationQualityZone } from "@/lib/body/bodyOverviewInterpretationBar";

const ZONE_STYLES: Record<
  InterpretationQualityZone,
  { bg: string; fg: string }
> = {
  out_of_range: { bg: "#FCE8E8", fg: "#9E2F2F" },
  fair: { bg: "#FFF3D6", fg: "#8A6116" },
  good: { bg: "#E3EDF5", fg: "#2F5F8A" },
  optimal: { bg: "#E4EFE6", fg: "#2F6B42" },
};

const NEUTRAL = { bg: "#E5E5EA", fg: "#636366" };

export type InterpretationRatingPillProps = {
  bar: InterpretationBarModel;
};

export function InterpretationRatingPill({ bar }: InterpretationRatingPillProps) {
  const colors = bar.hasValue ? ZONE_STYLES[bar.zone] : NEUTRAL;
  return (
    <View
      style={[styles.pill, { backgroundColor: colors.bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Text style={[styles.text, { color: colors.fg }]} numberOfLines={1}>
        {bar.displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "center",
    maxWidth: "48%",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.15,
  },
});
