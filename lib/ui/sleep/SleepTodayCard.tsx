import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { SleepTodayDetailVm } from "@/lib/data/sleep/buildSleepTodayDetailVm";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import { LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";
import { RECENT_WORKOUT_ROW_META_TEXT_STYLE } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";

export type SleepTodayCardProps = {
  model: SleepTodayDetailVm;
  testID?: string;
};

const MISSING_SUBTITLE_FALLBACK = "No completed sleep found for this day.";

function metricRowA11y(label: string, value: string): string {
  return `${label}, ${value}`;
}

type SleepTodayMissingCardProps = {
  model: Extract<SleepTodayDetailVm, { status: "missing" }>;
  testID: string;
  fallbackMessage: string;
};

function SleepTodayMissingCard({ model, testID, fallbackMessage }: SleepTodayMissingCardProps) {
  const router = useRouter();
  const message = model.message.length > 0 ? model.message : fallbackMessage;
  const cta = model.reason === "oura_disconnected" ? model.cta : undefined;

  const onReconnect = useCallback(() => {
    if (cta == null) return;
    router.push(cta.href as Parameters<typeof router.push>[0]);
  }, [cta, router]);

  const a11y =
    cta != null
      ? `Today. ${message}. ${cta.label}`
      : `Today. ${message}`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={a11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Today
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.heroMetric} numberOfLines={1} testID="sleep-today-hero-metric">
          {"\u2014 Sleep"}
        </Text>
        <Text style={styles.subtitle} testID="sleep-today-subtitle">
          {message}
        </Text>
        {cta != null ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cta.label}
            onPress={onReconnect}
            testID="sleep-today-oura-reconnect-cta"
            style={({ pressed }) => [styles.reconnectCta, pressed && styles.reconnectCtaPressed]}
          >
            <Text style={styles.reconnectCtaText}>{cta.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function SleepTodayCard({ model, testID = "sleep-today-card" }: SleepTodayCardProps) {
  if (model.status === "partial") {
    return (
      <View
        style={styles.card}
        testID={testID}
        accessible
        accessibilityLabel="Today sleep summary. Loading."
      >
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} accessibilityRole="header">
            Today
          </Text>
        </View>
        <LoadingState variant="inline" message="Loading sleep…" />
      </View>
    );
  }

  if (model.status === "missing") {
    return (
      <SleepTodayMissingCard
        model={model}
        testID={testID}
        fallbackMessage={MISSING_SUBTITLE_FALLBACK}
      />
    );
  }

  const cardModel = model.model;
  const rows = cardModel.metricRows;
  const subtitle = cardModel.lastNightSubtitle;

  const rowsA11y = rows.map((r) => metricRowA11y(r.label, r.value)).join(". ");
  const subtitleA11y = subtitle != null && subtitle.length > 0 ? ` ${subtitle}.` : "";
  const rootA11y = `Today. ${model.headlineWithUnit}.${subtitleA11y} ${rowsA11y}.`;

  return (
    <View style={styles.card} testID={testID} accessible accessibilityLabel={rootA11y}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle} accessibilityRole="header">
          Today
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.heroMetric} numberOfLines={1} testID="sleep-today-hero-metric">
          {model.headlineWithUnit}
        </Text>

        {subtitle != null && subtitle.length > 0 ? (
          <Text style={styles.subtitle} testID="sleep-today-subtitle">
            {subtitle}
          </Text>
        ) : null}

        {rows.length > 0 ? (
          <View style={styles.metricRows} testID="sleep-today-metric-rows" accessibilityRole="list">
            {rows.map((row) => (
              <View
                key={row.id}
                style={styles.metricRow}
                testID={`sleep-today-metric-row-${row.id}`}
                accessible
                accessibilityLabel={metricRowA11y(row.label, row.value)}
              >
                <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
                <Text style={dashMetricRowValueTextStyle}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 14,
    gap: 8,
    ...elevatedCardSurfaceStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    ...strengthMetricCardTitleTextStyle,
  },
  body: {
    gap: 8,
    paddingTop: 2,
  },
  /**
   * Hero headline `7h 32m Sleep` — matches Activity Today's `stepsMetric` typography so the two
   * surfaces read identically.
   */
  heroMetric: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  subtitle: {
    ...RECENT_WORKOUT_ROW_META_TEXT_STYLE,
    lineHeight: 18,
  },
  reconnectCta: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingVertical: 4,
  },
  reconnectCtaPressed: {
    opacity: 0.75,
  },
  reconnectCtaText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  metricRows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
});
