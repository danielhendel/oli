/**
 * Presentation-only Daily Monitor domain summary cards.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { DailyMonitorActivityCardModel } from "@/lib/data/dash/buildDailyMonitorActivityCardModel";
import type {
  DailyMonitorCardioCardModel,
  DailyMonitorWorkoutCardModel,
} from "@/lib/data/dash/buildDailyMonitorSessionCards";
import type { DailyMonitorStressCardModel } from "@/lib/data/dash/buildDailyMonitorStressCardModel";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

const cardChrome = {
  ...elevatedCardSurfaceStyle,
  backgroundColor: UI_CARD_SURFACE,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: UI_BORDER_HAIRLINE,
  borderRadius: 14,
  padding: 16,
  marginTop: 10,
  minHeight: 44,
} as const;

export function DailyMonitorActivityCard({
  model,
  href,
}: {
  model: DailyMonitorActivityCardModel;
  href: "/(app)/activity";
}): React.ReactElement {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens Activity"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.primaryValue} accessibilityRole="text">
        {model.stepsLabel}
      </Text>
      <Text style={styles.subtitle}>Steps</Text>
      {model.rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
          <Text style={dashMetricRowValueTextStyle}>
            {row.isAvailable ? row.valueLabel : "Unavailable"}
          </Text>
        </View>
      ))}
    </Pressable>
  );
}

export function DailyMonitorWorkoutCard({
  model,
  href,
}: {
  model: DailyMonitorWorkoutCardModel;
  href: "/(app)/workouts";
}): React.ReactElement {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens Workouts"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>Workout</Text>
      <Text style={styles.primaryValue}>{model.primaryTitle}</Text>
      {model.durationLabel ? <Text style={styles.subtitle}>{model.durationLabel}</Text> : null}
      {model.subtitle ? <Text style={styles.muted}>{model.subtitle}</Text> : null}
    </Pressable>
  );
}

export function DailyMonitorCardioCard({
  model,
  href,
}: {
  model: DailyMonitorCardioCardModel;
  href: "/(app)/cardio";
}): React.ReactElement {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens Cardio"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>Cardio</Text>
      <Text style={styles.primaryValue}>{model.primaryTitle}</Text>
      <Text style={styles.subtitle}>{model.primaryLine}</Text>
      {model.metaLine ? <Text style={styles.muted}>{model.metaLine}</Text> : null}
    </Pressable>
  );
}

export function DailyMonitorStressCard({
  model,
  href,
}: {
  model: DailyMonitorStressCardModel;
  href: "/(app)/recovery/stress";
}): React.ReactElement {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens Stress"
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>Stress</Text>
      <Text style={styles.primaryValue}>{model.daySummaryLabel}</Text>
      <Text style={styles.subtitle}>Source: {model.sourceLabel}</Text>
      {model.stressedMinutesLabel != null ? (
        <View style={styles.row}>
          <Text style={dashMetricRowLabelTextStyle}>Stressed time</Text>
          <Text style={dashMetricRowValueTextStyle}>{model.stressedMinutesLabel}</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={dashMetricRowLabelTextStyle}>Stressed time</Text>
          <Text style={dashMetricRowValueTextStyle}>Unavailable</Text>
        </View>
      )}
      {model.restoredMinutesLabel != null ? (
        <View style={styles.row}>
          <Text style={dashMetricRowLabelTextStyle}>Restored time</Text>
          <Text style={dashMetricRowValueTextStyle}>{model.restoredMinutesLabel}</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={dashMetricRowLabelTextStyle}>Restored time</Text>
          <Text style={dashMetricRowValueTextStyle}>Unavailable</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: cardChrome,
  pressed: { opacity: 0.92 },
  title: {
    ...strengthMetricCardTitleTextStyle,
    color: UI_TEXT_PRIMARY,
  },
  primaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
  muted: {
    marginTop: 4,
    fontSize: 13,
    color: UI_TEXT_MUTED,
  },
  row: {
    marginTop: 8,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
