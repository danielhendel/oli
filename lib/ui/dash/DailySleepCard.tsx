import React, { useCallback, useMemo, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import type { DailySleepMetricDetail } from "@/lib/data/dash/buildDailySleepCardModel";
import { SCORE_UNAVAILABLE_A11Y } from "@/lib/data/dash/buildDailySleepCardModel";
import type { DailySleepCardViewModel } from "@/lib/data/dash/dailySleepCardViewModel";
import { isDeepSleepDetailV1Enabled } from "@/lib/data/sleep/deepSleepDetailFlag";
import { isRemSleepDetailV1Enabled } from "@/lib/data/sleep/remSleepDetailFlag";
import { isSleepDurationDetailV1Enabled } from "@/lib/data/sleep/sleepDurationDetailFlag";
import { isSleepEfficiencyDetailV1Enabled } from "@/lib/data/sleep/sleepEfficiencyDetailFlag";
import { MetricDetailsSheet } from "@/lib/ui/common/MetricDetailsSheet";
import { DashMetricRow } from "@/lib/ui/dash/DashMetricRow";
import {
  DashCompactCardHeader,
  dashCompactPrimaryValueTextStyle,
} from "@/lib/ui/dash/DashCompactCardHeader";
import {
  buildOuraRatingAccessibility,
  mapOuraProviderRatingToTone,
} from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { SleepDurationDetailController } from "@/lib/ui/sleep/SleepDurationDetailController";
import { SleepEfficiencyDetailController } from "@/lib/ui/sleep/SleepEfficiencyDetailController";
import { SleepStageDetailController } from "@/lib/ui/sleep/SleepStageDetailController";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";
import type { DayKey } from "@/lib/ui/calendar/types";

type StageDetailOpen = "deep_sleep" | "rem_sleep" | null;

const SLEEP_DETAIL_HREF = "/(app)/recovery/sleep" as const;

/** Consumer loading/refresh copy — real ellipsis (never literal `\u2026` in JSX text). */
export const DAILY_SLEEP_LOADING_COPY = "Loading daily sleep…" as const;
export const DAILY_SLEEP_REFRESHING_COPY = "Refreshing daily sleep…" as const;

type Props = {
  vm: DailySleepCardViewModel;
  /** Consumer card title. Defaults to “Daily Sleep”. */
  title?: string;
  /** @deprecated Kept for call-site compatibility; Monitor summary no longer shows provider copy. */
  scoreCaption?: string | null;
  cardAccessibilityLabel?: string;
  /** Attributed SleepNight for Duration detail when the Phase 2D flag is enabled. */
  attributedSleepNight?: SleepNightDocumentDto | null;
  attributedSleepResolution?: SleepNightResolution | null;
};

export function DailySleepCard({
  vm,
  title = "Daily Sleep",
  scoreCaption: _scoreCaption = null,
  cardAccessibilityLabel = "Daily Sleep card",
  attributedSleepNight = null,
  attributedSleepResolution = null,
}: Props): React.ReactElement {
  void _scoreCaption;
  const router = useRouter();
  const [metricSheet, setMetricSheet] = useState<DailySleepMetricDetail | null>(null);
  const [durationOpen, setDurationOpen] = useState(false);
  const [stageDetailOpen, setStageDetailOpen] = useState<StageDetailOpen>(null);
  const [efficiencyOpen, setEfficiencyOpen] = useState(false);
  const durationRowRef = React.useRef<View>(null);
  const deepRowRef = React.useRef<View>(null);
  const remRowRef = React.useRef<View>(null);
  const efficiencyRowRef = React.useRef<View>(null);
  const durationDetailEnabled = isSleepDurationDetailV1Enabled();
  const deepDetailEnabled = isDeepSleepDetailV1Enabled();
  const remDetailEnabled = isRemSleepDetailV1Enabled();
  const efficiencyDetailEnabled = isSleepEfficiencyDetailV1Enabled();

  const loading = vm.status === "partial";
  const isRefreshing = vm.status === "ready" && vm.isRefreshing;
  const error = vm.status === "error" ? vm.message : null;
  const model = vm.status === "ready" ? vm.model : undefined;
  const missingMessage = vm.status === "missing" ? vm.message : null;
  const missingCta =
    vm.status === "missing" && vm.reason === "oura_disconnected" ? vm.cta : undefined;

  const selectedDay = vm.day as DayKey;

  const onOpenOuraReconnect = useCallback(() => {
    if (missingCta == null) return;
    router.push(missingCta.href as Parameters<typeof router.push>[0]);
  }, [missingCta, router]);

  const onOpenSleep = useCallback(() => {
    if (loading || error || vm.status !== "ready") return;
    router.push(SLEEP_DETAIL_HREF);
  }, [error, loading, router, vm.status]);

  const restoreFocusToRef = useCallback((ref: React.RefObject<View | null>) => {
    const node = ref.current;
    if (node == null) return;
    const handle = findNodeHandle(node);
    if (handle == null) return;
    AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  const closeDurationDetail = useCallback(() => {
    setDurationOpen(false);
    requestAnimationFrame(() => {
      restoreFocusToRef(durationRowRef);
    });
  }, [restoreFocusToRef]);

  const closeStageDetail = useCallback(() => {
    const closing = stageDetailOpen;
    setStageDetailOpen(null);
    requestAnimationFrame(() => {
      if (closing === "deep_sleep") restoreFocusToRef(deepRowRef);
      else if (closing === "rem_sleep") restoreFocusToRef(remRowRef);
    });
  }, [restoreFocusToRef, stageDetailOpen]);

  const closeEfficiencyDetail = useCallback(() => {
    setEfficiencyOpen(false);
    requestAnimationFrame(() => {
      restoreFocusToRef(efficiencyRowRef);
    });
  }, [restoreFocusToRef]);

  const onPressMetricRow = useCallback(
    (row: { id: string; isAvailable: boolean; detail: DailySleepMetricDetail }) => {
      if (row.id === "sleep_duration" && durationDetailEnabled) {
        if (!row.isAvailable) return;
        setDurationOpen(true);
        return;
      }
      if (row.id === "deep_sleep" && deepDetailEnabled) {
        if (!row.isAvailable) return;
        setStageDetailOpen("deep_sleep");
        return;
      }
      if (row.id === "rem_sleep" && remDetailEnabled) {
        if (!row.isAvailable) return;
        setStageDetailOpen("rem_sleep");
        return;
      }
      if (row.id === "sleep_efficiency" && efficiencyDetailEnabled) {
        if (!row.isAvailable) return;
        setEfficiencyOpen(true);
        return;
      }
      setMetricSheet(row.detail);
    },
    [durationDetailEnabled, deepDetailEnabled, remDetailEnabled, efficiencyDetailEnabled],
  );

  const primaryScoreLabel = useMemo(() => {
    if (!model?.hasAnySignal) return null;
    if (model.scoreUnavailable) return null;
    if (model.headlineValueText == null || model.headlineValueText.length === 0) return null;
    return `Sleep Score ${model.headlineValueText}`;
  }, [model]);

  const rating = useMemo(() => {
    if (!model?.ratingLabel || model.scoreUnavailable) return null;
    return {
      label: model.ratingLabel,
      tone: mapOuraProviderRatingToTone(model.ratingLabel),
      accessibilityLabel: buildOuraRatingAccessibility(model.ratingLabel),
    };
  }, [model]);

  const headerA11y = useMemo(() => {
    if (loading) return `${title} header. Loading sleep summary.`;
    if (isRefreshing) return `${title} header. Refreshing.`;
    if (error) return `${title} header. Could not load data.`;
    if (vm.status === "missing") return `${title} header. ${missingMessage ?? "No sleep data."}`;
    if (!model) return `${title} header. Not enough data.`;
    const parts: string[] = [title];
    if (primaryScoreLabel) {
      parts.push(`${primaryScoreLabel}.`);
    } else if (model.scoreUnavailable) {
      parts.push(SCORE_UNAVAILABLE_A11Y);
    }
    // Provider provenance is retained in typed/detail data; Monitor summary omits Oura.
    if (rating != null) parts.push(`Rating ${rating.label}.`);
    return `${parts.join(" ")} Opens Sleep details.`;
  }, [
    loading,
    isRefreshing,
    error,
    vm.status,
    missingMessage,
    model,
    title,
    primaryScoreLabel,
    rating,
  ]);

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
          <DashCompactCardHeader title={title} rating={rating} />
          {vm.status === "ready" && model?.hasAnySignal ? (
            primaryScoreLabel != null ? (
              <Text style={styles.headlineValue} accessibilityRole="text">
                {primaryScoreLabel}
              </Text>
            ) : model.scoreUnavailable ? (
              <Text
                style={styles.mutedLine}
                accessibilityLabel={SCORE_UNAVAILABLE_A11Y}
                accessibilityRole="text"
              >
                Unavailable
              </Text>
            ) : null
          ) : null}
          {loading ? <Text style={styles.mutedLine}>{DAILY_SLEEP_LOADING_COPY}</Text> : null}
          {isRefreshing ? <Text style={styles.mutedLine}>{DAILY_SLEEP_REFRESHING_COPY}</Text> : null}
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
          {vm.status === "ready" && model && showEmptyBody && model.emptyStateTitle ? (
            <>
              <Text style={styles.emptyTitle}>{model.emptyStateTitle}</Text>
              {model.emptyStateSubtitle ? (
                <Text style={styles.emptySubtitle}>{model.emptyStateSubtitle}</Text>
              ) : null}
            </>
          ) : null}
        </Pressable>

        {showMetricSection && model ? (
          <View style={styles.metricSection} accessibilityRole="list">
            {model.metricRows.map((row) => {
              const isDuration = row.id === "sleep_duration";
              const isDeep = row.id === "deep_sleep";
              const isRem = row.id === "rem_sleep";
              const isEfficiency = row.id === "sleep_efficiency";
              const usesNewDetail =
                (isDuration && durationDetailEnabled) ||
                (isDeep && deepDetailEnabled) ||
                (isRem && remDetailEnabled) ||
                (isEfficiency && efficiencyDetailEnabled);
              const canPress = !(usesNewDetail && !row.isAvailable);
              let accessibilityHint = "Opens sleep metric details";
              if (isDuration && durationDetailEnabled) {
                accessibilityHint = "Opens sleep duration details";
              } else if (isDeep && deepDetailEnabled) {
                accessibilityHint = "Opens deep sleep details";
              } else if (isRem && remDetailEnabled) {
                accessibilityHint = "Opens REM sleep details";
              } else if (isEfficiency && efficiencyDetailEnabled) {
                accessibilityHint = "Opens sleep efficiency details";
              }
              const rowEl = (
                <DashMetricRow
                  key={row.id}
                  testID={`sleep-metric-row-${row.id}`}
                  label={row.label}
                  displayValue={row.value}
                  accessibilityValue={row.accessibilityValue}
                  accessibilityHint={accessibilityHint}
                  {...(canPress
                    ? {
                        onPress: () => {
                          onPressMetricRow(row);
                        },
                      }
                    : {})}
                />
              );
              if (isDuration) {
                return (
                  <View key={row.id} ref={durationRowRef} collapsable={false}>
                    {rowEl}
                  </View>
                );
              }
              if (isDeep) {
                return (
                  <View key={row.id} ref={deepRowRef} collapsable={false}>
                    {rowEl}
                  </View>
                );
              }
              if (isRem) {
                return (
                  <View key={row.id} ref={remRowRef} collapsable={false}>
                    {rowEl}
                  </View>
                );
              }
              if (isEfficiency) {
                return (
                  <View key={row.id} ref={efficiencyRowRef} collapsable={false}>
                    {rowEl}
                  </View>
                );
              }
              return rowEl;
            })}
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

        {durationDetailEnabled && durationOpen ? (
          <SleepDurationDetailController
            selectedDay={selectedDay}
            sleepNight={attributedSleepNight}
            resolution={attributedSleepResolution}
            currentFormattedOverride={model?.durationValueText ?? null}
            onClose={closeDurationDetail}
          />
        ) : null}

        {stageDetailOpen != null ? (
          <SleepStageDetailController
            metricId={stageDetailOpen}
            selectedDay={selectedDay}
            sleepNight={attributedSleepNight}
            resolution={attributedSleepResolution}
            currentFormattedOverride={
              model?.metricRows.find((r) => r.id === stageDetailOpen)?.value ?? null
            }
            onClose={closeStageDetail}
          />
        ) : null}

        {efficiencyDetailEnabled && efficiencyOpen ? (
          <SleepEfficiencyDetailController
            selectedDay={selectedDay}
            sleepNight={attributedSleepNight}
            resolution={attributedSleepResolution}
            currentFormattedOverride={
              model?.metricRows.find((r) => r.id === "sleep_efficiency")?.value ?? null
            }
            onClose={closeEfficiencyDetail}
          />
        ) : null}
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
  headlineValue: dashCompactPrimaryValueTextStyle,
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
