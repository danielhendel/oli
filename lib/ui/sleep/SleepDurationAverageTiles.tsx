/**
 * Sleep Duration average tiles (7d / 30d). Presentation only — no averaging.
 */

import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import type { SleepDurationAverageSummary } from "@/lib/data/sleep/sleepDurationAverages";
import { UI_BORDER_HAIRLINE, UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type SleepDurationAverageTilesProps = {
  sevenDay: SleepDurationAverageSummary;
  thirtyDay: SleepDurationAverageSummary;
  /** When true, show skeleton placeholders instead of values. */
  loading?: boolean;
  testID?: string;
};

function tileTitle(window: SleepDurationAverageSummary["window"]): string {
  return window === "7d" ? "7 DAYS" : "30 DAYS";
}

function AverageTile({
  summary,
  loading,
  testID,
  stacked,
}: {
  summary: SleepDurationAverageSummary;
  loading?: boolean;
  testID: string;
  stacked: boolean;
}): React.ReactElement {
  return (
    <View
      style={[styles.tile, stacked && styles.tileStacked]}
      testID={testID}
      accessible
      accessibilityLabel={
        loading ? `${tileTitle(summary.window)}. Loading averages.` : summary.accessibilitySummary
      }
    >
      <Text style={styles.tileLabel}>{tileTitle(summary.window)}</Text>
      {loading ? (
        <View style={styles.skeletonValue} testID={`${testID}-skeleton`} />
      ) : (
        <Text
          style={[styles.tileValue, !summary.hasEnoughData && styles.tileValueMuted]}
          numberOfLines={2}
        >
          {summary.displayValue}
        </Text>
      )}
      <Text style={styles.tileCoverage}>
        {loading ? "—" : summary.coverageLabel}
      </Text>
    </View>
  );
}

export function SleepDurationAverageTiles({
  sevenDay,
  thirtyDay,
  loading = false,
  testID = "sleep-duration-averages",
}: SleepDurationAverageTilesProps): React.ReactElement {
  const [stacked, setStacked] = useState(false);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // Stack when the row is narrow (large Dynamic Type / small width).
    setStacked(w > 0 && w < 320);
  };

  return (
    <View style={styles.wrap} testID={testID} onLayout={onLayout}>
      <Text style={styles.heading}>Your averages</Text>
      <View style={[styles.row, stacked && styles.rowStacked]}>
        <AverageTile
          summary={sevenDay}
          loading={loading}
          testID={`${testID}-7d`}
          stacked={stacked}
        />
        <AverageTile
          summary={thirtyDay}
          loading={loading}
          testID={`${testID}-30d`}
          stacked={stacked}
        />
      </View>
    </View>
  );
}

/** Skeleton-only averages block while history loads (stable height). */
export function SleepDurationAverageTilesSkeleton({
  testID = "sleep-duration-averages",
}: {
  testID?: string;
}): React.ReactElement {
  const placeholder: SleepDurationAverageSummary = {
    window: "7d",
    averageMinutes: null,
    formattedAverage: null,
    validNightCount: 0,
    expectedNightCount: 7,
    hasEnoughData: false,
    coverageLabel: "—",
    displayValue: "Not enough data",
    accessibilitySummary: "Loading",
  };
  const thirty: SleepDurationAverageSummary = {
    ...placeholder,
    window: "30d",
    expectedNightCount: 30,
  };
  return (
    <SleepDurationAverageTiles
      sevenDay={placeholder}
      thirtyDay={thirty}
      loading
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowStacked: {
    flexDirection: "column",
  },
  tile: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  tileStacked: {
    flex: undefined,
    width: "100%",
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: UI_TEXT_MUTED,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    fontVariant: ["tabular-nums"],
  },
  tileValueMuted: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  tileCoverage: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
  },
  skeletonValue: {
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 2,
  },
});
