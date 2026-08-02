// lib/ui/labs/LabsMainContent.tsx
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { mapLabsLoadErrorToConsumer } from "@/lib/data/labs/mapLabsLoadErrorToConsumer";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { LabsCategoryCard, type LabsCategoryCardVm } from "@/lib/ui/labs/LabsCategoryCard";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { getLabCategories, getLabMetricByKey } from "@/lib/labs/labMetricCatalog";
import type { LabsSummaryResponseDto } from "@/lib/contracts";

export type LabsMainContentProps = {
  status: "partial" | "error" | "ready";
  /** @deprecated Ignored for consumer presentation — mapped to stable Labs copy. */
  error?: string;
  /** @deprecated Never rendered in consumer Labs UI. */
  requestId?: string | null;
  data?: LabsSummaryResponseDto;
  onRetry?: () => void;
  onPressMetric: (metricKey: string) => void;
  labsOsEnabled?: boolean;
  pendingReviewCount?: number;
  onPressReviewQueue?: () => void;
};

/** True when the user has no structured lab values and no stored uploads. */
export function isLabsSummaryEmpty(data: LabsSummaryResponseDto | undefined): boolean {
  if (!data) return true;
  if (data.uploadCount > 0) return false;
  return !data.categories.some((c) =>
    c.metrics.some((m) => {
      const text = m.latestValueText?.trim() ?? "";
      return text.length > 0 && text !== "—";
    }),
  );
}

function buildCardsFromSummary(data: LabsSummaryResponseDto): LabsCategoryCardVm[] {
  const summaryByKey = new Map(data.categories.map((c) => [c.categoryKey, c]));

  return getLabCategories().map((category) => {
    const summary = summaryByKey.get(category.categoryKey);
    const metricsByKey = new Map(summary?.metrics.map((m) => [m.metricKey, m]) ?? []);

    return {
      categoryKey: category.categoryKey,
      title: category.displayName,
      rows: category.metricKeys.map((metricKey) => {
        const fromApi = metricsByKey.get(metricKey);
        const catalog = getLabMetricByKey(metricKey);
        return {
          metricKey,
          label: fromApi?.displayName ?? catalog?.displayName ?? metricKey,
          valueText: fromApi?.latestValueText ?? "—",
          flag: fromApi?.flag ?? null,
        };
      }),
    };
  });
}

export function LabsMainContent({
  status,
  error,
  requestId,
  data,
  onRetry,
  onPressMetric,
  labsOsEnabled = false,
  pendingReviewCount = 0,
  onPressReviewQueue,
}: LabsMainContentProps) {
  const cards = useMemo(() => {
    if (!data) return [];
    return buildCardsFromSummary(data);
  }, [data]);

  if (status === "partial") {
    return <LoadingState message="Loading labs…" testID="labs-loading" />;
  }

  if (status === "error") {
    const consumer = mapLabsLoadErrorToConsumer({
      error: error ?? null,
      requestId: requestId ?? null,
    });
    return (
      <ErrorState
        title={consumer.title}
        message={consumer.message}
        testID="labs-error"
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  if (isLabsSummaryEmpty(data)) {
    return (
      <View style={styles.root} testID="labs-main-content-empty">
        <EmptyState
          title="No lab reports yet"
          description={
            labsOsEnabled
              ? "Upload a report to securely store the original file. Oli extracts and verifies supported results automatically."
              : "Upload a report to securely store the original file. Structured extraction is not available yet."
          }
          testID="labs-empty-state"
        />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="labs-main-content">
      {labsOsEnabled && pendingReviewCount > 0 && onPressReviewQueue ? (
        <Pressable
          onPress={onPressReviewQueue}
          accessibilityRole="button"
          accessibilityLabel={`Report complete, ${pendingReviewCount} report${pendingReviewCount === 1 ? "" : "s"} with processing details`}
          style={({ pressed }) => [styles.reviewBanner, pressed && styles.reviewBannerPressed]}
          testID="labs-review-needed-entry"
        >
          <View style={styles.reviewBannerMain}>
            <Text style={styles.reviewBannerTitle}>Report complete</Text>
            <Text style={styles.reviewBannerMeta}>
              Some results could not be safely resolved — open for details
            </Text>
          </View>
          <Text style={styles.reviewBannerChevron}>{"\u203A"}</Text>
        </Pressable>
      ) : null}
      <View style={styles.cards}>
        {cards.map((card) => (
          <LabsCategoryCard key={card.categoryKey} card={card} onPressMetric={onPressMetric} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  reviewBanner: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(58, 91, 219, 0.35)",
    backgroundColor: "rgba(58, 91, 219, 0.12)",
  },
  reviewBannerPressed: { opacity: 0.9 },
  reviewBannerMain: { flex: 1, gap: 2 },
  reviewBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  reviewBannerMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  reviewBannerChevron: {
    fontSize: 18,
    color: SYSTEM_ACCENT,
    fontWeight: "600",
  },
  cards: { gap: 12 },
});
