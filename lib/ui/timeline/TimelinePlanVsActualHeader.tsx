import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TodayCommandModel } from "@/lib/today/types";
import { TodayTargetProgressRow } from "@/lib/ui/today/TodayTargetProgressRow";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  model: TodayCommandModel | null;
  loading?: boolean;
  isToday: boolean;
};

export function TimelinePlanVsActualHeader({ model, loading, isToday }: Props): React.ReactElement | null {
  if (!isToday) return null;

  if (loading) {
    return (
      <View style={styles.wrap} testID="timeline-plan-loading">
        <Text style={styles.loading}>Loading plan vs actual…</Text>
      </View>
    );
  }

  if (model == null) return null;

  return (
    <View style={styles.wrap} testID="timeline-plan-vs-actual">
      <Text style={styles.title} accessibilityRole="header">
        Plan vs actual
      </Text>
      <Text style={styles.completion} accessibilityLabel={`${model.completionPercent} percent of today's plan complete`}>
        {model.completionPercent}% of today's plan complete
      </Text>
      {model.targets.map((row) => (
        <TodayTargetProgressRow key={row.id} row={row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_BORDER_HAIRLINE,
    gap: 4,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    marginBottom: 2,
  },
  completion: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginBottom: 6,
  },
  loading: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    paddingVertical: 8,
  },
});
