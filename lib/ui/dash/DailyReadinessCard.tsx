import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { DailyReadinessCardModel } from "@/lib/data/dash/buildDailyReadinessCardModel";
import type { DashReadinessMetricRowId } from "@/lib/data/dash/buildDashReadinessMetricRows";
import type { Readiness } from "@/lib/contracts/readiness";
import { buildOuraScoreRatingAccessibility } from "@/lib/data/dash/dailyMonitorPresentationRatings";
import { DashMetricRow } from "@/lib/ui/dash/DashMetricRow";
import {
  DashCompactCardHeader,
  dashCompactPrimaryValueTextStyle,
} from "@/lib/ui/dash/DashCompactCardHeader";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

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
};

export function DailyReadinessCard({
  vm,
  title = "Oura Readiness",
}: Props): React.ReactElement {
  const router = useRouter();

  const loading = vm.status === "partial";
  const error = vm.status === "error" ? vm.message : null;
  const model = vm.status === "ready" ? vm.model : undefined;
  const missingMessage = vm.status === "missing" ? vm.message : null;
  const missingCta = vm.status === "missing" ? vm.cta : undefined;

  const onOpenReadiness = useCallback(() => {
    if (loading || error || vm.status !== "ready") return;
    router.push(READINESS_DETAIL_HREF);
  }, [error, loading, router, vm.status]);

  const onOpenReadinessContributor = useCallback(
    (rowId: DashReadinessMetricRowId) => {
      if (loading || error || vm.status !== "ready") return;
      const contributor = READINESS_CONTRIBUTOR_ROUTE_IDS[rowId];
      router.push({
        pathname: READINESS_DETAIL_HREF,
        params: { contributor },
      });
    },
    [error, loading, router, vm.status],
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
    const source =
      model.sourceLabel != null && model.sourceLabel.trim().length > 0 ? model.sourceLabel : "Oura";
    return {
      label: model.ratingLabel,
      sourceLabel: source,
      accessibilityLabel: buildOuraScoreRatingAccessibility({
        domain: "readiness",
        ratingLabel: model.ratingLabel,
      }),
    };
  }, [model]);

  const headerA11y =
    vm.status === "ready"
      ? [
          title,
          primaryScoreLabel != null ? `${primaryScoreLabel}.` : null,
          // Single Oura+rating announcement (badge is accessibility-hidden under the Pressable).
          rating != null ? `${rating.accessibilityLabel}.` : "Source Oura.",
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
            {model.metricRows.map((row) => (
              <DashMetricRow
                key={row.id}
                testID={`readiness-metric-row-${row.id}`}
                label={row.label}
                displayValue={row.displayValue}
                accessibilityValue={row.accessibilityValue}
                accessibilityHint="Opens readiness details"
                onPress={() => {
                  onOpenReadinessContributor(row.id);
                }}
              />
            ))}
          </View>
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
