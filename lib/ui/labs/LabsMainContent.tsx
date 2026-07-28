// lib/ui/labs/LabsMainContent.tsx
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { LabsCategoryCard, type LabsCategoryCardVm } from "@/lib/ui/labs/LabsCategoryCard";
import { getLabCategories, getLabMetricByKey } from "@/lib/labs/labMetricCatalog";
import type { LabsSummaryResponseDto } from "@/lib/contracts";

export type LabsMainContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  data?: LabsSummaryResponseDto;
  onRetry?: () => void;
  onPressMetric: (metricKey: string) => void;
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
}: LabsMainContentProps) {
  const cards = useMemo(() => {
    if (!data) return [];
    return buildCardsFromSummary(data);
  }, [data]);

  if (status === "partial") {
    return <LoadingState message="Loading labs…" testID="labs-loading" />;
  }

  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load labs"}
        requestId={requestId ?? null}
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
          description="Upload a report to securely store the original file. Structured extraction is not available yet."
          testID="labs-empty-state"
        />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="labs-main-content">
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
  cards: { gap: 12 },
});
