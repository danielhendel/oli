/**
 * Cardio weekly-mileage ladder — full legend + tier meanings + optional row context (presentation-only).
 */

import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import {
  cardioDistanceTierLabel,
  type CardioDistanceTier,
} from "@/lib/data/workouts/cardioSessionPresentation";
import {
  CARDIO_RANGE_DISPLAY_RANGE_LINE,
  CARDIO_RANGE_EXPLAINER_TIER_ORDER,
  CARDIO_RANGE_TIER_EXPLANATIONS,
} from "@/lib/ui/workouts/cardioRangeExplainerCopy";
import { CardioBaselineFrequencyLegend } from "@/lib/ui/workouts/CardioBaselineFrequencyLegend";
import { rangeExplainerSheetStyles as styles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";

const INTRO_COPY =
  "Cardio ranges compare your average weekly distance across key time ranges.";

export default function CardioRangeExplainerScreen() {
  const params = useLocalSearchParams<{
    window?: string;
    tierIndex?: string;
    tierLabel?: string;
    displayValue?: string;
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
  const tierEnumFromIndex =
    tierIdx != null ? CARDIO_RANGE_EXPLAINER_TIER_ORDER[tierIdx] ?? null : null;
  const tierLabelResolved =
    tierLabelFromParams ??
    (tierEnumFromIndex != null ? cardioDistanceTierLabel(tierEnumFromIndex) : null);

  const showPersonal =
    windowLabel.length > 0 &&
    tierLabelResolved != null &&
    displayValueRaw.length > 0 &&
    displayValueRaw !== "—";

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID="cardio-range-explainer-scroll"
    >
      <Text style={styles.lead}>{INTRO_COPY}</Text>

      <View style={styles.legendSection}>
        <CardioBaselineFrequencyLegend />
      </View>

      <Text style={styles.sectionHeading}>What each range means</Text>
      {CARDIO_RANGE_EXPLAINER_TIER_ORDER.map((tier: CardioDistanceTier) => (
        <View
          key={tier}
          style={styles.tierBlock}
          accessibilityLabel={`${cardioDistanceTierLabel(tier)}. ${CARDIO_RANGE_DISPLAY_RANGE_LINE[tier]}.`}
        >
          <Text style={styles.tierTitle}>{cardioDistanceTierLabel(tier)}</Text>
          <Text style={styles.tierRange}>{CARDIO_RANGE_DISPLAY_RANGE_LINE[tier]}</Text>
          <Text style={styles.tierBody}>{CARDIO_RANGE_TIER_EXPLANATIONS[tier]}</Text>
        </View>
      ))}

      {showPersonal ? (
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
      ) : null}
    </ScrollView>
  );
}
