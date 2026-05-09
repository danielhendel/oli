/**
 * Activity daily-step tiers — legend + tier meanings + optional row context (presentation-only).
 */

import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { ACTIVITY_RANGE_TIER_EXPLANATIONS } from "@/lib/ui/activity/activityRangeExplainerCopy";
import { ActivityStepTierLegend } from "@/lib/ui/activity/ActivityStepTierLegend";
import { MetricRangesExplainerLayout } from "@/lib/ui/metrics/MetricRangesExplainerLayout";
import { rangeExplainerSheetStyles as styles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";
import {
  ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS,
  ACTIVITY_STEP_DESCRIPTOR_RANGE_LINES,
} from "@/lib/utils/activityStepRating";

const INTRO_COPY = "Activity ranges compare your average daily steps across key time ranges.";

export default function ActivityRangeExplainerScreen() {
  const params = useLocalSearchParams<{
    window?: string;
    tierLabel?: string;
    displayValue?: string;
    tierIndex?: string;
  }>();

  const windowLabel = typeof params.window === "string" ? params.window.trim() : "";
  const tierLabelFromParams =
    typeof params.tierLabel === "string" && params.tierLabel.trim().length > 0 ? params.tierLabel.trim() : null;
  const displayValueRaw = typeof params.displayValue === "string" ? params.displayValue.trim() : "";
  const tierIndexRaw = typeof params.tierIndex === "string" ? params.tierIndex.trim() : "";
  const tierIdx =
    tierIndexRaw !== "" && Number.isFinite(Number(tierIndexRaw))
      ? Math.min(5, Math.max(0, Math.floor(Number(tierIndexRaw))))
      : null;
  const tierLabelResolved =
    tierLabelFromParams ??
    (tierIdx != null ? ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS[tierIdx] ?? null : null);

  const showPersonal =
    windowLabel.length > 0 &&
    tierLabelResolved != null &&
    displayValueRaw.length > 0 &&
    displayValueRaw !== "—";

  const tiers = ACTIVITY_STEP_DESCRIPTOR_PILL_LABELS.map((descriptor, i) => {
    const range = ACTIVITY_STEP_DESCRIPTOR_RANGE_LINES[i]!;
    const body = ACTIVITY_RANGE_TIER_EXPLANATIONS[i] ?? "";
    return { title: descriptor, rangeLine: range, body };
  });

  return (
    <MetricRangesExplainerLayout
      lead={INTRO_COPY}
      legendSlot={
        <ActivityStepTierLegend
          listTestID="activity-range-explainer-tier-legend"
          tierRowTestID={(i) => `activity-range-explainer-tier-row-${i}`}
          tierDotTestID={(i) => `activity-range-explainer-tier-dot-${i}`}
        />
      }
      sectionHeading="What each range means"
      tiers={tiers}
      scrollTestID="activity-range-explainer-scroll"
      footerSlot={
        showPersonal ? (
          <View
            style={styles.personalCard}
            accessibilityLabel={`${windowLabel}. ${tierLabelResolved}. ${displayValueRaw}.`}
          >
            <Text style={styles.personalHeading}>Your context</Text>
            <Text style={styles.personalLine}>
              <Text style={styles.personalEmphasis}>{windowLabel}</Text>
              {`: ${tierLabelResolved} — ${displayValueRaw}`}
            </Text>
          </View>
        ) : null
      }
    />
  );
}
