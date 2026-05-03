import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActivityStepTierLegend } from "@/lib/ui/activity/ActivityStepTierLegend";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

import { UI_CARD_SURFACE, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
const CHEVRON_SIZE = 22;

const STEP_RATINGS_EXPLAINER_BODY =
  "Your daily step count reflects your overall activity level. Consistently higher steps support cardiovascular fitness, energy, and long-term health.";

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
            color={UI_TEXT_SECONDARY}
          />
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.expandedBlock}>
          <Text style={styles.body}>{STEP_RATINGS_EXPLAINER_BODY}</Text>

          <ActivityStepTierLegend
            listTestID="activity-step-ratings-tier-list"
            tierRowTestID={(i) => `activity-step-ratings-tier-${i}`}
            tierDotTestID={(i) => `activity-step-ratings-tier-dot-${i}`}
            tierListStyle={styles.stepRatingsTierListOffset}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 14,
    gap: 0,
    ...elevatedCardSurfaceStyle,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 19,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.34,
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
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.22,
    lineHeight: 24,
  },
  stepRatingsTierListOffset: {
    marginTop: 4,
  },
});
