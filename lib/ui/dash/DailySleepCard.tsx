import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { DailySleepMetricDetail } from "@/lib/data/dash/buildDailySleepCardModel";
import { SCORE_UNAVAILABLE_A11Y } from "@/lib/data/dash/buildDailySleepCardModel";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import { MetricDetailsSheet } from "@/lib/ui/common/MetricDetailsSheet";
import { DashMetricRow } from "@/lib/ui/dash/DashMetricRow";
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

/** Match Oura Readiness / Daily Energy hero score treatment. */
const HEADLINE_VALUE_TEXT: React.ComponentProps<typeof Text>["style"] = {
  fontSize: 34,
  lineHeight: 40,
  color: UI_TEXT_PRIMARY,
  fontWeight: "700",
  letterSpacing: -0.2,
  fontVariant: ["tabular-nums"],
};

type Props = {
  vm: DailySleepCardViewModel;
  /** Consumer card title. Defaults to “Daily Sleep”. */
  title?: string;
  /** Caption under the score (e.g. “Oura Sleep Score”). */
  scoreCaption?: string | null;
  cardAccessibilityLabel?: string;
};

export function DailySleepCard({
  vm,
  title = "Daily Sleep",
  scoreCaption = null,
  cardAccessibilityLabel = "Daily Sleep card",
}: Props): React.ReactElement {
  const router = useRouter();
  const [metricSheet, setMetricSheet] = useState<DailySleepMetricDetail | null>(null);

  const loading = vm.status === "partial";
  const isRefreshing = vm.status === "ready" && vm.isRefreshing;
  const error = vm.status === "error" ? vm.message : null;
  const model = vm.status === "ready" ? vm.model : undefined;
  const missingMessage = vm.status === "missing" ? vm.message : null;
  const missingCta =
    vm.status === "missing" && vm.reason === "oura_disconnected" ? vm.cta : undefined;

  const onOpenOuraReconnect = useCallback(() => {
    if (missingCta == null) return;
    router.push(missingCta.href as Parameters<typeof router.push>[0]);
  }, [missingCta, router]);

  const onOpenSleep = useCallback(() => {
    if (loading || error || vm.status !== "ready") return;
    router.push(SLEEP_DETAIL_HREF);
  }, [error, loading, router, vm.status]);

  const headerA11y = useMemo(() => {
    if (loading) return `${title} header. Loading sleep summary.`;
    if (isRefreshing) return `${title} header. Refreshing.`;
    if (error) return `${title} header. Could not load data.`;
    if (vm.status === "missing") return `${title} header. ${missingMessage ?? "No sleep data."}`;
    if (!model) return `${title} header. Not enough data.`;
    const parts: string[] = [];
    if (model.lastNightSubtitle) parts.push(model.lastNightSubtitle);
    if (model.scoreUnavailable) {
      parts.push(SCORE_UNAVAILABLE_A11Y);
    } else if (model.headlineValueText) {
      parts.push(
        scoreCaption
          ? `${scoreCaption} ${model.headlineValueText}.`
          : `Sleep score ${model.headlineValueText}.`,
      );
      if (model.ratingLabel) parts.push(model.ratingLabel);
    }
    if (model.summarySentence) parts.push(model.summarySentence);
    return `${title} header. ${parts.join(" ")} Opens Sleep details.`;
  }, [loading, isRefreshing, error, vm.status, missingMessage, model, title, scoreCaption]);

  const showEmptyBody = vm.status === "missing" || (vm.status === "ready" && model != null && !model.hasAnySignal);
  const canOpenSleep = vm.status === "ready" && model != null && model.hasAnySignal;

  const showMetricSection = vm.status === "ready" && Boolean(model?.metricRows.length) && model?.hasAnySignal;

  return (
    <View style={styles.outer} accessibilityLabel={cardAccessibilityLabel}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={headerA11y}
          accessibilityHint="Opens Sleep details"
          disabled={!canOpenSleep}
          onPress={onOpenSleep}
          style={({ pressed }) => [styles.headerPressable, pressed && canOpenSleep && styles.headerPressed]}
        >
          <Text style={styles.title}>{title}</Text>
          {vm.status === "ready" && model?.lastNightSubtitle ? (
            <Text style={styles.subtitle}>{model.lastNightSubtitle}</Text>
          ) : null}
          {vm.status === "ready" && model?.hasAnySignal ? (
            model.scoreUnavailable ? (
              <>
                <Text
                  style={styles.headlineValue}
                  accessibilityLabel={SCORE_UNAVAILABLE_A11Y}
                  accessibilityRole="text"
                >
                  {"\u2014"}
                </Text>
                <Text style={styles.rating}>{model.scoreUnavailableLabel}</Text>
              </>
            ) : model.headlineValueText ? (
              <>
                <Text style={styles.headlineValue} accessibilityRole="text">
                  {model.headlineValueText}
                </Text>
                {scoreCaption ? (
                  <Text style={styles.rating} accessibilityRole="text">
                    {scoreCaption}
                  </Text>
                ) : null}
                {model.ratingLabel ? <Text style={styles.rating}>{model.ratingLabel}</Text> : null}
              </>
            ) : null
          ) : null}
          {loading ? <Text style={styles.mutedLine}>Loading daily sleep\u2026</Text> : null}
          {isRefreshing ? <Text style={styles.mutedLine}>Refreshing daily sleep\u2026</Text> : null}
          {error ? <Text style={styles.mutedLine}>Could not load daily sleep</Text> : null}
          {vm.status === "missing" ? (
            <>
              <Text style={styles.mutedLine} testID="daily-sleep-missing-message">
                {missingMessage}
              </Text>
              {missingCta != null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={missingCta.label}
                  onPress={onOpenOuraReconnect}
                  testID="daily-sleep-oura-reconnect-cta"
                  style={({ pressed }) => [styles.reconnectCta, pressed && styles.reconnectCtaPressed]}
                >
                  <Text style={styles.reconnectCtaText}>{missingCta.label}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
          {vm.status === "ready" && model ? (
            <>
              {model.summarySentence ? <Text style={styles.summary}>{model.summarySentence}</Text> : null}
              {showEmptyBody && model.emptyStateTitle ? (
                <>
                  <Text style={styles.emptyTitle}>{model.emptyStateTitle}</Text>
                  {model.emptyStateSubtitle ? (
                    <Text style={styles.emptySubtitle}>{model.emptyStateSubtitle}</Text>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </Pressable>

        {showMetricSection && model ? (
          <View style={styles.metricSection} accessibilityRole="list">
            {model.metricRows.map((row) => (
              <DashMetricRow
                key={row.id}
                testID={`sleep-metric-row-${row.id}`}
                label={row.label}
                displayValue={row.value}
                accessibilityValue={row.accessibilityValue}
                accessibilityHint="Opens sleep metric details"
                onPress={() => {
                  setMetricSheet(row.detail);
                }}
              />
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
    gap: 4,
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
  rating: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginTop: 2,
  },
  mutedLine: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  reconnectCta: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  reconnectCtaPressed: {
    opacity: 0.75,
  },
  reconnectCtaText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
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
    paddingTop: 6,
    gap: 2,
  },
});
