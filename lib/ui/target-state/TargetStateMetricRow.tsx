// lib/ui/target-state/TargetStateMetricRow.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TargetStateMetric } from "@/lib/data/target-state/types";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type TargetStateMetricRowProps = {
  metric: TargetStateMetric;
};

export function TargetStateMetricRow({ metric }: TargetStateMetricRowProps): React.ReactElement {
  if (metric.dataStatus === "unavailable") {
    return (
      <View style={styles.row} testID={`target-metric-${metric.metricId}`}>
        <Text style={styles.label}>{metric.label}</Text>
        <Text style={styles.unavailable}>Baseline data unavailable</Text>
      </View>
    );
  }

  const progression =
    metric.dataStatus === "maintain-optimal"
      ? `Level ${metric.currentLevel} → Maintain Optimal`
      : `Level ${metric.currentLevel} → Level ${metric.nextLevel}`;

  return (
    <View style={styles.row} testID={`target-metric-${metric.metricId}`}>
      <Text style={styles.label}>{metric.label}</Text>
      <Text style={styles.progression}>{progression}</Text>
      <Text style={styles.classification}>
        {metric.currentClassification}
        {metric.nextClassification != null ? ` → ${metric.nextClassification}` : ""}
      </Text>
      {metric.nextLevelRange != null ? (
        <Text style={styles.range}>Next range: {metric.nextLevelRange}</Text>
      ) : null}
      {metric.optimalLevelRange != null ? (
        <Text style={styles.range}>Optimal range: {metric.optimalLevelRange}</Text>
      ) : null}
      <View style={styles.milestones}>
        {metric.milestoneTargets.slice(0, 3).map((m) => (
          <Text key={m.horizon} style={styles.milestone}>
            {formatHorizon(m.horizon)}: {m.description}
          </Text>
        ))}
      </View>
    </View>
  );
}

function formatHorizon(horizon: string): string {
  const labels: Record<string, string> = {
    oneWeek: "1 week",
    oneMonth: "1 month",
    threeMonths: "3 months",
    oneYear: "1 year",
    fiveYears: "5 years",
    tenYears: "10 years",
  };
  return labels[horizon] ?? horizon;
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  label: { fontSize: 15, fontWeight: "600", color: UI_TEXT_PRIMARY },
  progression: { fontSize: 14, fontWeight: "700", color: SYSTEM_ACCENT },
  classification: { fontSize: 13, color: UI_TEXT_SECONDARY },
  range: { fontSize: 12, color: UI_TEXT_TERTIARY_LABEL },
  unavailable: { fontSize: 13, color: UI_TEXT_TERTIARY_LABEL, fontStyle: "italic" },
  milestones: { marginTop: 4, gap: 2 },
  milestone: { fontSize: 12, lineHeight: 17, color: UI_TEXT_SECONDARY },
});
