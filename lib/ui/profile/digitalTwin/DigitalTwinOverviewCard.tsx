// lib/ui/profile/digitalTwin/DigitalTwinOverviewCard.tsx
// Digital Twin Overview: HealthScore composite + tier, HealthSignals status, completeness.
// Surfaces server truths only; never shows fake zeroes when data is insufficient.
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import {
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { OverviewVm } from "@/lib/features/profile/digitalTwin/types";

export type DigitalTwinOverviewCardProps = {
  overview: OverviewVm;
};

function formatUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DigitalTwinOverviewCard({
  overview,
}: DigitalTwinOverviewCardProps): React.ReactElement {
  const {
    compositeScore,
    compositeTierLabel,
    signalStatusLabel,
    signalAttention,
    insufficientData,
    completenessLabel,
    lastUpdated,
    loading,
    signedOut,
  } = overview;

  const updatedLabel = formatUpdated(lastUpdated);

  const accessibilityLabel = signedOut
    ? "Digital Twin overview, sign in to view"
    : loading
      ? "Digital Twin overview, loading"
      : compositeScore != null
        ? `Digital Twin overview. Health score ${compositeScore}, ${compositeTierLabel ?? ""}. ${
            signalStatusLabel ?? ""
          }. ${completenessLabel}`
        : `Digital Twin overview. ${completenessLabel}`;

  return (
    <View style={styles.card} accessibilityLabel={accessibilityLabel} testID="dt-overview-card">
      <Text style={[strengthMetricCardTitleTextStyle, styles.title]} accessibilityRole="header">
        Overview
      </Text>

      {signedOut ? (
        <Text style={styles.status}>Sign in to view your Digital Twin.</Text>
      ) : loading ? (
        <Text style={styles.status}>Building your model…</Text>
      ) : (
        <>
          {compositeScore != null ? (
            <View style={styles.scoreRow}>
              <Text style={styles.score} testID="dt-overview-score">
                {compositeScore}
              </Text>
              {compositeTierLabel ? (
                <Text style={styles.tier}>{compositeTierLabel}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.status} testID="dt-overview-insufficient">
              {insufficientData
                ? "Not enough data yet to score your health."
                : "Add health data to build your score."}
            </Text>
          )}

          {signalStatusLabel ? (
            <Text
              style={[styles.signal, signalAttention ? styles.signalAttention : styles.signalStable]}
              testID="dt-overview-signal"
            >
              {signalStatusLabel}
            </Text>
          ) : null}

          <Text style={styles.completeness} testID="dt-overview-completeness">
            {completenessLabel}
          </Text>

          {updatedLabel ? (
            <Text style={styles.updated}>Updated {updatedLabel}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 6,
    marginTop: 12,
    backgroundColor: UI_CARD_SURFACE,
  },
  title: {
    flexShrink: 1,
    minWidth: 0,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 2,
  },
  score: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  tier: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
    marginBottom: 6,
  },
  signal: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  signalStable: {
    color: "#30D158",
  },
  signalAttention: {
    color: "#FFD60A",
  },
  completeness: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  updated: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_MUTED,
  },
});
