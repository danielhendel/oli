/**
 * Strength weekly-frequency ladder — full legend + tier meanings + optional row context (presentation-only).
 */

import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { STRENGTH_RANGE_TIER_EXPLANATIONS } from "@/lib/ui/workouts/strengthRangeExplainerCopy";
import { rangeExplainerSheetStyles as styles } from "@/lib/ui/workouts/rangeExplainerSheetStyles";
import { StrengthBaselineFrequencyLegend } from "@/lib/ui/workouts/StrengthBaselineFrequencyLegend";
import type { StrengthWeeklyFrequencyTierBand } from "@/lib/utils/strengthWeeklyFrequencyRating";
import {
  strengthWeeklyFrequencyRatingLabelFromTierBand,
  strengthWeeklyFrequencyTierBandRangeLabel,
} from "@/lib/utils/strengthWeeklyFrequencyRating";

const BANDS: readonly StrengthWeeklyFrequencyTierBand[] = [0, 1, 2, 3, 4, 5];

export default function StrengthRangeExplainerScreen() {
  const params = useLocalSearchParams<{
    avg?: string;
    window?: string;
    tierBand?: string;
    tierLabel?: string;
  }>();

  const avgRaw = typeof params.avg === "string" ? params.avg.trim() : "";
  const avgNum = avgRaw !== "" && Number.isFinite(Number(avgRaw)) ? Number(avgRaw) : null;

  const windowLabel = typeof params.window === "string" ? params.window.trim() : "";
  const tierBandRaw = typeof params.tierBand === "string" ? params.tierBand.trim() : "";
  const tierBandParsed =
    tierBandRaw !== "" && Number.isFinite(Number(tierBandRaw))
      ? (Math.min(5, Math.max(0, Math.floor(Number(tierBandRaw)))) as StrengthWeeklyFrequencyTierBand)
      : null;

  const tierLabelFromParams =
    typeof params.tierLabel === "string" && params.tierLabel.trim().length > 0 ? params.tierLabel.trim() : null;
  const tierLabelResolved =
    tierLabelFromParams ??
    (tierBandParsed != null ? strengthWeeklyFrequencyRatingLabelFromTierBand(tierBandParsed) : null);

  const showPersonal =
    windowLabel.length > 0 && avgNum != null && Number.isFinite(avgNum) && tierLabelResolved != null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID="strength-range-explainer-scroll"
    >
      <Text style={styles.lead}>
        Average strength sessions per week are grouped into bands along a 0–7 scale. Bars use the same colors as these
        tiers.
      </Text>

      <View style={styles.legendSection}>
        <StrengthBaselineFrequencyLegend />
      </View>

      <Text style={styles.sectionHeading}>What each range means</Text>
      {BANDS.map((band) => (
        <View
          key={band}
          style={styles.tierBlock}
          accessibilityLabel={`${strengthWeeklyFrequencyRatingLabelFromTierBand(band)}. ${strengthWeeklyFrequencyTierBandRangeLabel(band)} workouts per week.`}
        >
          <Text style={styles.tierTitle}>{strengthWeeklyFrequencyRatingLabelFromTierBand(band)}</Text>
          <Text style={styles.tierRange}>{strengthWeeklyFrequencyTierBandRangeLabel(band)} workouts / week</Text>
          <Text style={styles.tierBody}>{STRENGTH_RANGE_TIER_EXPLANATIONS[band]}</Text>
        </View>
      ))}

      {showPersonal ? (
        <View
          style={styles.personalCard}
          accessibilityLabel={`Your ${windowLabel}. ${tierLabelResolved}. ${avgNum!.toFixed(1)} strength workouts per week on average.`}
        >
          <Text style={styles.personalHeading}>Your context</Text>
          <Text style={styles.personalLine}>
            <Text style={styles.personalEmphasis}>{windowLabel}</Text>
            {`: ${tierLabelResolved}`}
          </Text>
          <Text style={styles.personalValue}>{`${avgNum!.toFixed(1)} strength workouts per week (average)`}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
