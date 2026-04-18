import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { ACTIVITY_STEP_TIER_KEYS, STEP_TIER_COLORS } from "@/lib/utils/activityStepTierVisual";

const CHEVRON_SIZE = 22;
const CHEVRON_COLOR = "#8E8E93";
const TIER_DOT_SIZE = 7;

/** Display-only legend lines (thresholds unchanged in {@link activityStepRating}). */
const STEP_RATINGS_TIER_LEGEND_ROWS: readonly { label: string; range: string; meaning: string }[] = [
  { label: "Low", range: "under 5,000", meaning: "Sedentary" },
  { label: "Below Avg", range: "5,000\u20137,499", meaning: "Lightly active" },
  { label: "Average", range: "7,500\u20139,999", meaning: "Moderately active" },
  { label: "Good", range: "10,000\u201312,499", meaning: "Active" },
  { label: "Great", range: "12,500\u201314,999", meaning: "Very active" },
  { label: "Elite", range: "15,000+", meaning: "Highly active" },
] as const;

const STEP_RATINGS_EXPLAINER_BODY =
  "Your daily step count reflects your overall activity level. Consistently higher steps support cardiovascular fitness, energy, and long-term health.";

function rangeForA11y(range: string): string {
  return range.replace(/\u2013/g, " to ");
}

/**
 * Collapsible static tier legend — text rows + tier-color dots (no progress bar).
 */
export function ActivityStepRatingsCard() {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          Step Ratings
        </Text>
        <Pressable
          testID="activity-step-ratings-toggle"
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Collapse step ratings" : "Expand step ratings"}
          accessibilityState={{ expanded }}
          hitSlop={12}
          style={({ pressed }) => [styles.toggleHit, pressed && styles.togglePressed]}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={CHEVRON_SIZE}
            color={CHEVRON_COLOR}
          />
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.expandedBlock}>
          <Text style={styles.body}>{STEP_RATINGS_EXPLAINER_BODY}</Text>

          <View style={styles.tierList} accessibilityRole="list" testID="activity-step-ratings-tier-list">
            {STEP_RATINGS_TIER_LEGEND_ROWS.map((row, i) => {
              const tierKey = ACTIVITY_STEP_TIER_KEYS[i]!;
              return (
                <View
                  key={row.label}
                  style={styles.tierRow}
                  testID={`activity-step-ratings-tier-${i}`}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={`${row.label}, ${rangeForA11y(row.range)}, ${row.meaning}`}
                >
                  <View
                    style={[styles.tierDot, { backgroundColor: STEP_TIER_COLORS[tierKey] }]}
                    testID={`activity-step-ratings-tier-dot-${i}`}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={styles.tierLine} numberOfLines={2}>
                    <Text style={styles.tierLabel}>{row.label}</Text>
                    <Text style={styles.tierMeta}>
                      {" \u2014 "}
                      {row.range}
                      {" \u2014 "}
                      {row.meaning}
                    </Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 21,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.38,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleHit: {
    minWidth: 44,
    minHeight: 44,
    marginRight: -8,
    marginVertical: -6,
    justifyContent: "center",
    alignItems: "center",
  },
  togglePressed: {
    opacity: 0.55,
  },
  expandedBlock: {
    gap: 18,
    marginTop: 14,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
    color: "#48484A",
    letterSpacing: -0.22,
    lineHeight: 24,
  },
  tierList: {
    gap: 16,
    marginTop: 4,
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
