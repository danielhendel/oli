import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import {
  ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS,
  ACTIVITY_STEP_DESCRIPTOR_RANGE_LINES,
} from "@/lib/utils/activityStepRating";
import { ACTIVITY_STEP_TIER_KEYS, STEP_TIER_COLORS } from "@/lib/utils/activityStepTierVisual";

const TIER_DOT_SIZE = 7;

function rangeForA11y(range: string): string {
  return range.replace(/\u2013/g, " to ");
}

export type ActivityStepTierLegendProps = {
  listTestID: string;
  tierRowTestID: (tierIndex: number) => string;
  tierDotTestID: (tierIndex: number) => string;
  /** Optional wrapper style for the list container (e.g. offset when nested under explainer copy). */
  tierListStyle?: StyleProp<ViewStyle>;
};

/** Six-band Activity step legend — labels and ranges from {@link ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS} / {@link ACTIVITY_STEP_DESCRIPTOR_RANGE_LINES}. */
export function ActivityStepTierLegend({
  listTestID,
  tierRowTestID,
  tierDotTestID,
  tierListStyle,
}: ActivityStepTierLegendProps) {
  return (
    <View style={[styles.tierList, tierListStyle]} accessibilityRole="list" testID={listTestID}>
      {ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS.map((descriptor, i) => {
        const tierKey = ACTIVITY_STEP_TIER_KEYS[i]!;
        const range = ACTIVITY_STEP_DESCRIPTOR_RANGE_LINES[i]!;
        return (
          <View
            key={descriptor}
            style={styles.tierRow}
            testID={tierRowTestID(i)}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${descriptor}, ${rangeForA11y(range)}`}
          >
            <View
              style={[styles.tierDot, { backgroundColor: STEP_TIER_COLORS[tierKey] }]}
              testID={tierDotTestID(i)}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.tierLine} numberOfLines={2}>
              <Text style={styles.tierLabel}>{descriptor}</Text>
              <Text style={styles.tierMeta}>
                {" \u2014 "}
                {range}
              </Text>
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tierList: {
    gap: 14,
    alignSelf: "stretch",
  },
  tierRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tierDot: {
    width: TIER_DOT_SIZE,
    height: TIER_DOT_SIZE,
    borderRadius: TIER_DOT_SIZE / 2,
    marginTop: 6,
    flexShrink: 0,
  },
  tierLine: {
    flex: 1,
    fontSize: 15,
    letterSpacing: -0.12,
    lineHeight: 23,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  tierMeta: {
    fontSize: 15,
    fontWeight: "400",
    color: "#48484A",
  },
});
