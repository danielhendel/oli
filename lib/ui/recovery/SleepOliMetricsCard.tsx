import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";

import type { DailyFactsDto } from "@oli/contracts";
import { buildSleepOliMetricRows } from "@/lib/format/sleepOliMetricRows";
import { SleepOliMetricRow } from "@/lib/ui/recovery/SleepOliMetricRow";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";

type Props = {
  sleep: NonNullable<DailyFactsDto["sleep"]>;
};

const ROW_GAP = 22;

/**
 * Oli-native sleep metrics from DailyFacts — composition only; rows delegate to {@link SleepOliMetricRow}.
 */
export function SleepOliMetricsCard({ sleep }: Props) {
  const rows = useMemo(() => buildSleepOliMetricRows(sleep), [sleep]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{"Last night's sleep"}</Text>
      <View style={styles.metricList}>
        {rows.map((row) => (
          <SleepOliMetricRow key={row.key} row={row} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    ...elevatedCardSurfaceStyle,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
    letterSpacing: -0.35,
  },
  metricList: {
    gap: ROW_GAP,
  },
});
