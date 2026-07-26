import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import type { SleepNightDocumentDto, SleepNightResolution } from "@oli/contracts";

import type { DailyReadinessCardModel } from "@/lib/data/dash/buildDailyReadinessCardModel";
import type { DashReadinessMetricRowId } from "@/lib/data/dash/buildDashReadinessMetricRows";
import type { Readiness } from "@/lib/contracts/readiness";
import { isRestingHeartRateDetailV1Enabled } from "@/lib/data/readiness/restingHeartRateDetailFlag";
import { resolveRestingHeartRateBpm } from "@/lib/data/readiness/restingHeartRateValue";
import {
  buildOuraRatingAccessibility,
  mapOuraProviderRatingToTone,
} from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { DashMetricRow } from "@/lib/ui/dash/DashMetricRow";
import {
  DashCompactCardHeader,
  dashCompactPrimaryValueTextStyle,
} from "@/lib/ui/dash/DashCompactCardHeader";
import { RestingHeartRateDetailController } from "@/lib/ui/readiness/RestingHeartRateDetailController";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";
import type { DayKey } from "@/lib/ui/calendar/types";

const READINESS_DETAIL_HREF = "/(app)/recovery/readiness" as const;

/** Semantic contributor ids for readiness detail deep-link (query). */
export const READINESS_CONTRIBUTOR_ROUTE_IDS: Record<DashReadinessMetricRowId, string> = {
  resting_heart_rate: "resting-heart-rate",
  hrv_balance: "hrv-balance",
  body_temperature: "body-temperature",
  recovery_index: "recovery-index",
  sleep_balance: "sleep-balance",
};

export type DailyReadinessCardViewModel =
  | { status: Extract<Readiness, "partial">; day: string }
  | {
      status: Extract<Readiness, "missing">;
      day: string;
      message: string;
      cta?: { label: string; href: string };
    }
  | { status: Extract<Readiness, "error">; day: string; message: string }
  | {
      status: Extract<Readiness, "ready">;
      day: string;
      model: DailyReadinessCardModel;
      accessibilityLabel: string;
    };

type Props = {
  vm: DailyReadinessCardViewModel;
  /** Consumer card title. Defaults to “Oura Readiness”. */
  title?: string;
  /** Attributed SleepNight for Resting Heart Rate detail when the Phase 2F-B flag is enabled. */
  attributedSleepNight?: SleepNightDocumentDto | null;
  attributedSleepResolution?: SleepNightResolution | null;
};

function hasPhysiologicalRestingHeartRateBpm(input: {
  sleepNight: SleepNightDocumentDto | null | undefined;
  resolution: SleepNightResolution | null | undefined;
}): boolean {
  if (input.sleepNight == null) return false;
  if (input.resolution === "latest_completed_prior_night") return false;
  if (input.sleepNight.isComplete !== true) return false;
  return resolveRestingHeartRateBpm(input.sleepNight.lowestHeartRateBpm) != null;
}

export function DailyReadinessCard({
  vm,
  title = "Oura Readiness",
  attributedSleepNight = null,
  attributedSleepResolution = null,
}: Props): React.ReactElement {
  const router = useRouter();
  const [rhrDetailOpen, setRhrDetailOpen] = useState(false);
  const rhrRowRef = useRef<View>(null);
  const rhrDetailEnabled = isRestingHeartRateDetailV1Enabled();

  const loading = vm.status === "partial";
  const error = vm.status === "error" ? vm.message : null;
  const model = vm.status === "ready" ? vm.model : undefined;
  const missingMessage = vm.status === "missing" ? vm.message : null;
  const missingCta = vm.status === "missing" ? vm.cta : undefined;
  const selectedDay = vm.day as DayKey;

  const restoreFocusToRef = useCallback((ref: React.RefObject<View | null>) => {
    const node = ref.current;
    if (node == null) return;
    const handle = findNodeHandle(node);
    if (handle == null) return;
    AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  const closeRhrDetail = useCallback(() => {
    setRhrDetailOpen(false);
    requestAnimationFrame(() => {
      restoreFocusToRef(rhrRowRef);
    });
  }, [restoreFocusToRef]);

  const onOpenReadiness = useCallback(() => {
    if (loading || error || vm.status !== "ready") return;
    router.push(READINESS_DETAIL_HREF);
  }, [error, loading, router, vm.status]);

  const onOpenReadinessContributor = useCallback(
    (rowId: DashReadinessMetricRowId) => {
      if (loading || error || vm.status !== "ready") return;

      if (rowId === "resting_heart_rate" && rhrDetailEnabled) {
        const canOpenDetail = hasPhysiologicalRestingHeartRateBpm({
          sleepNight: attributedSleepNight,
          resolution: attributedSleepResolution,
        });
        if (!canOpenDetail) return;
        setRhrDetailOpen(true);
        return;
      }

      const contributor = READINESS_CONTRIBUTOR_ROUTE_IDS[rowId];
      router.push({
        pathname: READINESS_DETAIL_HREF,
        params: { contributor },
      });
    },
    [
      attributedSleepNight,
      attributedSleepResolution,
      error,
      loading,
      rhrDetailEnabled,
      router,
      vm.status,
    ],
  );

  const onOpenOuraReconnect = useCallback(() => {
    if (missingCta == null) return;
    router.push(missingCta.href as Parameters<typeof router.push>[0]);
  }, [missingCta, router]);

  const primaryScoreLabel = useMemo(() => {
    if (model?.headlineValueText == null || model.headlineValueText.length === 0) return null;
    return `Readiness Score ${model.headlineValueText}`;
  }, [model]);

  const rating = useMemo(() => {
    if (model?.ratingLabel == null) return null;
    return {
      label: model.ratingLabel,
      tone: mapOuraProviderRatingToTone(model.ratingLabel),
      accessibilityLabel: buildOuraRatingAccessibility(model.ratingLabel),
    };
  }, [model]);

  const headerA11y =
    vm.status === "ready"
      ? [
          title,
          primaryScoreLabel != null ? `${primaryScoreLabel}.` : null,
          // Provider provenance remains in typed/detail data; Monitor summary omits Oura.
          rating != null ? `Rating ${rating.label}.` : null,
          "Opens Readiness details.",
        ]
          .filter(Boolean)
          .join(" ")
      : loading
        ? `${title} header. Loading.`
        : error
          ? `${title} header. Could not load data.`
          : `${title} header. ${missingMessage ?? "No readiness data."}`;

  const canOpen = vm.status === "ready" && model?.hasAnySignal;
  const showMetricSection =
    vm.status === "ready" && model?.hasAnySignal === true && (model.metricRows?.length ?? 0) > 0;

  const rhrOverride =
    model?.metricRows.find((r) => r.id === "resting_heart_rate")?.displayValue ?? null;

  return (
    <View style={styles.outer} accessibilityLabel={`${title} card`}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={headerA11y}
          accessibilityHint="Opens Readiness details"
          disabled={!canOpen}
          onPress={onOpenReadiness}
          style={({ pressed }) => [styles.headerPressable, pressed && canOpen && styles.headerPressed]}
        >
          <DashCompactCardHeader title={title} rating={rating} />
          {primaryScoreLabel != null ? (
            <Text style={styles.headlineValue}>{primaryScoreLabel}</Text>
          ) : null}
          {loading ? <Text style={styles.mutedLine}>Loading daily readiness…</Text> : null}
          {error ? <Text style={styles.mutedLine}>Could not load daily readiness</Text> : null}
          {vm.status === "missing" ? (
            <>
              <Text style={styles.mutedLine}>{missingMessage}</Text>
              {missingCta ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={missingCta.label}
                  onPress={onOpenOuraReconnect}
                  style={styles.ctaPressable}
                >
                  <Text style={styles.ctaText}>{missingCta.label}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </Pressable>

        {showMetricSection && model ? (
          <View style={styles.metricSection} accessibilityRole="list">
            {model.metricRows.map((row) => {
              const isRhr = row.id === "resting_heart_rate";
              const rhrCanOpenDetail =
                isRhr &&
                rhrDetailEnabled &&
                hasPhysiologicalRestingHeartRateBpm({
                  sleepNight: attributedSleepNight,
                  resolution: attributedSleepResolution,
                });
              const canPress = !(isRhr && rhrDetailEnabled && !rhrCanOpenDetail);
              const accessibilityHint =
                isRhr && rhrDetailEnabled
                  ? "Opens resting heart rate details"
                  : "Opens readiness details";

              const rowEl = (
                <DashMetricRow
                  key={row.id}
                  testID={`readiness-metric-row-${row.id}`}
                  label={row.label}
                  displayValue={row.displayValue}
                  accessibilityValue={row.accessibilityValue}
                  accessibilityHint={accessibilityHint}
                  {...(canPress
                    ? {
                        onPress: () => {
                          onOpenReadinessContributor(row.id);
                        },
                      }
                    : {})}
                />
              );

              if (isRhr) {
                return (
                  <View key={row.id} ref={rhrRowRef} collapsable={false}>
                    {rowEl}
                  </View>
                );
              }
              return rowEl;
            })}
          </View>
        ) : null}

        {rhrDetailEnabled && rhrDetailOpen ? (
          <RestingHeartRateDetailController
            selectedDay={selectedDay}
            sleepNight={attributedSleepNight}
            resolution={attributedSleepResolution}
            currentFormattedOverride={rhrOverride}
            onClose={closeRhrDetail}
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
    backgroundColor: UI_CARD_SURFACE,
    gap: 8,
  },
  headerPressable: {
    gap: 4,
  },
  headerPressed: {
    opacity: 0.9,
  },
  headlineValue: dashCompactPrimaryValueTextStyle,
  mutedLine: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    marginTop: 4,
  },
  ctaPressable: {
    marginTop: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  metricSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
    paddingTop: 6,
    gap: 2,
  },
});
