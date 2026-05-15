import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { DailySleepCardModel, DailySleepMetricDetail } from "@/lib/data/dash/buildDailySleepCardModel";
import { MetricDetailsSheet } from "@/lib/ui/common/MetricDetailsSheet";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import { strengthMetricCardTitleTextStyle } from "@/lib/ui/workouts/strengthMetricCardTitleStyle";

const SLEEP_DETAIL_HREF = "/(app)/recovery/sleep" as const;

/** Match Daily Energy main result (`DailyEnergyCard` `rangeValue`). */
const HEADLINE_VALUE_TEXT: React.ComponentProps<typeof Text>["style"] = {
  fontSize: 34,
  lineHeight: 40,
  color: UI_TEXT_PRIMARY,
  fontWeight: "700",
  letterSpacing: -0.2,
};

type Props = {
  model: DailySleepCardModel | undefined;
  loading: boolean;
  /** Shown when refreshing with a prior stable model (no skeleton takeover). */
  isRefreshing?: boolean;
  error: string | null;
};

export function DailySleepCard({
  model,
  loading,
  isRefreshing = false,
  error,
}: Props): React.ReactElement {
  const router = useRouter();
  const [metricSheet, setMetricSheet] = useState<DailySleepMetricDetail | null>(null);

  const onOpenSleep = useCallback(() => {
    if (loading || error) return;
    router.push(SLEEP_DETAIL_HREF);
  }, [error, loading, router]);

  const headerA11y = useMemo(() => {
    if (loading) return "Daily Sleep header. Loading sleep summary.";
    if (isRefreshing) return "Daily Sleep header. Refreshing.";
    if (error) return "Daily Sleep header. Could not load data.";
    if (!model) return "Daily Sleep header. Not enough data.";
    const parts: string[] = [];
    if (model.lastNightSubtitle) parts.push(model.lastNightSubtitle);
    if (model.headlineValueText) parts.push(`Sleep duration ${model.headlineValueText}.`);
    if (model.summarySentence) parts.push(model.summarySentence);
    return `Daily Sleep header. ${parts.join(" ")} Opens Sleep details.`;
  }, [loading, isRefreshing, error, model]);

  const showEmptyBody = !loading && !error && model && !model.hasAnySignal;
  const canOpenSleep = !loading && !error;

  const showMetricSection = Boolean(model?.metricRows.length);

  return (
    <View style={styles.outer} accessibilityLabel="Daily Sleep card">
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={headerA11y}
          accessibilityHint="Opens Sleep details"
          disabled={!canOpenSleep}
          onPress={onOpenSleep}
          style={({ pressed }) => [styles.headerPressable, pressed && canOpenSleep && styles.headerPressed]}
        >
          <Text style={styles.title}>Daily Sleep</Text>
          {!loading && !error && model?.lastNightSubtitle ? (
            <Text style={styles.subtitle}>{model.lastNightSubtitle}</Text>
          ) : null}
          {!loading && !error && model?.headlineValueText ? (
            <Text style={styles.headlineValue} accessibilityRole="text">
              {model.headlineValueText}
            </Text>
          ) : null}
          {!loading && isRefreshing ? (
            <Text style={styles.mutedLine}>Refreshing daily sleep\u2026</Text>
          ) : null}
          {!loading && error ? <Text style={styles.mutedLine}>Could not load daily sleep</Text> : null}
          {!loading && !error && !model ? (
            <Text style={styles.mutedLine}>Not enough data yet for sleep summary.</Text>
          ) : null}
          {!loading && !error && model ? (
            <>
              {model.summarySentence ? <Text style={styles.summary}>{model.summarySentence}</Text> : null}
              {showEmptyBody ? (
                <>
                  {model.emptyStateTitle ? <Text style={styles.emptyTitle}>{model.emptyStateTitle}</Text> : null}
                  {model.emptyStateSubtitle ? (
                    <Text style={styles.emptySubtitle}>{model.emptyStateSubtitle}</Text>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </Pressable>

        {!loading && !error && model && showMetricSection ? (
          <View style={styles.metricSection} accessibilityRole="list">
            {model.metricRows.map((row) => (
              <Pressable
                key={row.id}
                testID={`sleep-metric-row-${row.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}. ${row.value}. Open details`}
                onPress={() => {
                  setMetricSheet(row.detail);
                }}
                style={({ pressed }) => [styles.metricPressable, pressed && styles.metricPressablePressed]}
              >
                <View style={styles.metricRowInner}>
                  <Text style={styles.label}>{row.label}</Text>
                  <View style={styles.metricRight}>
                    <Text style={styles.value}>{row.value}</Text>
                    <Text
                      style={styles.chevron}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    >
                      {"\u203A"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <MetricDetailsSheet
          visible={metricSheet != null}
          onClose={() => {
            setMetricSheet(null);
          }}
          {...(metricSheet != null
            ? {
                title: metricSheet.title,
                value: metricSheet.value,
                body: metricSheet.body,
                ...(metricSheet.sourceLine != null && metricSheet.sourceLine !== ""
                  ? { sourceLine: metricSheet.sourceLine }
                  : {}),
                ...(metricSheet.contextLine != null && metricSheet.contextLine !== ""
                  ? { contextLine: metricSheet.contextLine }
                  : {}),
              }
            : {
                title: "",
                value: "",
                body: "",
              })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginTop: 12,
  },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    padding: 15,
    gap: 8,
    backgroundColor: UI_CARD_SURFACE,
  },
  headerPressable: {
    borderRadius: 10,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerPressed: {
    opacity: 0.92,
  },
  title: strengthMetricCardTitleTextStyle,
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  headlineValue: HEADLINE_VALUE_TEXT,
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  mutedLine: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    marginTop: 2,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  metricSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 8,
    gap: 4,
  },
  metricPressable: {
    borderRadius: 8,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  metricPressablePressed: {
    opacity: 0.75,
  },
  metricRowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metricRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    fontWeight: "500",
    flexShrink: 1,
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    color: UI_TEXT_PRIMARY,
    fontWeight: "600",
    textAlign: "right",
  },
});
