import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buildTodayProgressCardRows } from "@/lib/today/buildTodayProgressCardRows";
import type { TodayCommandModel } from "@/lib/today/types";
import { TodayProgressCardRow } from "@/lib/ui/today/TodayProgressCardRow";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_CARD_SURFACE, UI_TEXT_MUTED } from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

type Props = {
  model: TodayCommandModel | null;
  loading?: boolean;
};

export function TodayProgressCard({ model, loading }: Props): React.ReactElement {
  const rows = useMemo(
    () => (model != null ? buildTodayProgressCardRows(model) : []),
    [model],
  );

  return (
    <View style={styles.card} accessibilityLabel="Today's progress card" testID="today-progress-card">
      <Text style={styles.title} accessibilityRole="header">
        Today&apos;s Progress
      </Text>

      {loading ? (
        <Text style={styles.status} testID="today-progress-loading">
          Loading today&apos;s progress…
        </Text>
      ) : (
        <View style={styles.rowsWrap} testID="today-progress-rows">
          {rows.map((row, index) => (
            <TodayProgressCardRow key={row.id} row={row} isLast={index === rows.length - 1} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 4,
    marginTop: 8,
    backgroundColor: UI_CARD_SURFACE,
  },
  title: strengthMetricCardTitleTextStyle,
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    paddingVertical: 8,
  },
  rowsWrap: {
    marginTop: 2,
  },
});
