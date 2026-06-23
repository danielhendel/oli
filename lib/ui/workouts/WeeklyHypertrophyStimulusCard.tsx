import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { WeeklyHypertrophyStimulusCardModel } from "@/lib/ui/workouts/buildWeeklyHypertrophyStimulusCardModel";
import { dashMetricRowLabelTextStyle, dashMetricRowValueTextStyle } from "@/lib/ui/dash/dashMetricRowTextStyle";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type WeeklyHypertrophyStimulusCardProps = {
  model: WeeklyHypertrophyStimulusCardModel;
  onPress?: () => void;
  testID?: string;
};

function buildCardAccessibilityLabel(model: WeeklyHypertrophyStimulusCardModel): string {
  return [
    model.title,
    model.subtitle,
    model.topRegions.length > 0
      ? `Top regions: ${model.topRegions.map((region) => `${region.label} ${region.band}`).join(", ")}`
      : null,
    `Weekly fatigue ${model.fatigueBand}`,
    `Recovery demand ${model.recoveryBand}`,
    model.fallbackNote,
  ]
    .filter((part) => part != null && part.length > 0)
    .join(". ");
}

function WeeklyHypertrophyStimulusCardBody({
  model,
}: {
  model: WeeklyHypertrophyStimulusCardModel;
}): React.ReactElement {
  return (
    <>
      <Text style={styles.cardSubtitle} testID="weekly-hypertrophy-stimulus-subtitle">
        {model.subtitle}
      </Text>

      {model.topRegions.length > 0 ? (
        <View
          style={styles.section}
          accessible
          accessibilityLabel={`Top regions. ${model.topRegions.map((region) => `${region.label}, ${region.band}`).join(". ")}`}
        >
          <Text style={styles.sectionLabel}>Top regions</Text>
          {model.topRegions.map((region) => (
            <View key={region.label} style={styles.regionRow}>
              <Text style={dashMetricRowLabelTextStyle}>{region.label}</Text>
              <Text style={dashMetricRowValueTextStyle}>{region.band}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.metricRow}>
        <Text style={dashMetricRowLabelTextStyle}>Weekly fatigue</Text>
        <Text style={dashMetricRowValueTextStyle}>{model.fatigueBand}</Text>
      </View>

      <View style={styles.metricRow}>
        <Text style={dashMetricRowLabelTextStyle}>Recovery demand</Text>
        <Text style={dashMetricRowValueTextStyle}>{model.recoveryBand}</Text>
      </View>

      {model.fallbackNote != null ? (
        <Text
          style={styles.fallbackNote}
          testID="weekly-hypertrophy-stimulus-fallback-note"
          accessibilityLabel={model.fallbackNote}
        >
          {model.fallbackNote}
        </Text>
      ) : null}
    </>
  );
}

export function WeeklyHypertrophyStimulusCard({
  model,
  onPress,
  testID = "weekly-hypertrophy-stimulus-card",
}: WeeklyHypertrophyStimulusCardProps): React.ReactElement {
  const accessibilityLabel = buildCardAccessibilityLabel(model);

  if (onPress != null) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Open weekly muscle stimulus details"
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        testID={testID}
      >
        <View style={styles.tappableHeaderRow}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {model.title}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={UI_TEXT_PRIMARY} />
        </View>
        <WeeklyHypertrophyStimulusCardBody model={model} />
      </Pressable>
    );
  }

  return (
    <View
      style={styles.card}
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.cardTitle} accessibilityRole="header">
        {model.title}
      </Text>
      <WeeklyHypertrophyStimulusCardBody model={model} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  cardPressed: {
    opacity: 0.92,
  },
  tappableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: strengthMetricCardTitleTextStyle,
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
    marginBottom: 4,
  },
  section: {
    gap: 2,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    marginBottom: 2,
  },
  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  fallbackNote: {
    fontSize: 12,
    lineHeight: 17,
    color: UI_TEXT_MUTED,
    marginTop: 2,
  },
});
