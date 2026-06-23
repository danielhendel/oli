import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { WorkoutHypertrophyStimulusCardModel } from "@/lib/ui/workouts/buildWorkoutHypertrophyStimulusCardModel";
import { dashMetricRowLabelTextStyle, dashMetricRowValueTextStyle } from "@/lib/ui/dash/dashMetricRowTextStyle";
import { UI_BORDER_HAIRLINE, UI_TEXT_MUTED, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type WorkoutHypertrophyStimulusCardProps = {
  model: WorkoutHypertrophyStimulusCardModel;
};

export function WorkoutHypertrophyStimulusCard({
  model,
}: WorkoutHypertrophyStimulusCardProps): React.ReactElement {
  return (
    <View style={styles.card} testID="workout-hypertrophy-stimulus-card">
      <Text style={styles.title}>{model.title}</Text>

      {model.topRegions.length > 0 ? (
        <View style={styles.row}>
          <Text style={dashMetricRowLabelTextStyle}>Top regions</Text>
          <Text style={[dashMetricRowValueTextStyle, styles.valueWrap]} numberOfLines={2}>
            {model.topRegions.map((region) => region.label).join(" · ")}
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={dashMetricRowLabelTextStyle}>Estimated fatigue</Text>
        <Text style={dashMetricRowValueTextStyle}>{model.estimatedFatigue}</Text>
      </View>

      <View style={styles.row}>
        <Text style={dashMetricRowLabelTextStyle}>Recovery demand</Text>
        <Text style={dashMetricRowValueTextStyle}>{model.recoveryDemand}</Text>
      </View>

      {model.fallbackNote != null ? (
        <Text style={styles.fallbackNote} testID="workout-hypertrophy-stimulus-fallback-note">
          {model.fallbackNote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 10,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  valueWrap: {
    flexShrink: 1,
    textAlign: "right",
  },
  fallbackNote: {
    fontSize: 12,
    lineHeight: 17,
    color: UI_TEXT_MUTED,
    marginTop: 2,
  },
});
