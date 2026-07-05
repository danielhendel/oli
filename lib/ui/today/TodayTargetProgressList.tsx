import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { TodayTargetProgress } from "@/lib/today/types";
import { TodayTargetProgressRow } from "@/lib/ui/today/TodayTargetProgressRow";
import { UI_BORDER_HAIRLINE, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";

type Props = {
  targets: readonly TodayTargetProgress[];
  loading?: boolean;
};

export function TodayTargetProgressList({ targets, loading }: Props): React.ReactElement {
  if (loading) {
    return (
      <View style={styles.wrap} testID="today-targets-loading">
        <Text style={styles.status}>Loading today's plan…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="today-target-progress-list">
      {targets.map((row) => (
        <TodayTargetProgressRow key={row.id} row={row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 8,
    gap: 2,
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    paddingVertical: 8,
  },
});
