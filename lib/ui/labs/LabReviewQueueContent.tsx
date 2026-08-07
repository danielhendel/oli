// lib/ui/labs/LabReviewQueueContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  formatReviewDate,
  fastingLabel,
  reportReviewStatusLabel,
  reviewSummaryCountsLabel,
} from "@/lib/ui/labs/labReviewPresentation";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { LabReviewSummaryDto } from "@/lib/contracts";

export type LabReviewQueueContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  items?: LabReviewSummaryDto[];
  onRetry?: () => void;
  onPressReview: (documentId: string) => void;
};

function ReviewRow({
  item,
  onPress,
}: {
  item: LabReviewSummaryDto;
  onPress: () => void;
}) {
  const collected = formatReviewDate(item.collectedAt);
  const reported = formatReviewDate(item.reportedAt);
  const fasting = fastingLabel(item.fasting);
  const statusLabel = reportReviewStatusLabel(item.status);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.safeDisplayFilename}, ${statusLabel}${collected ? `, Collected ${collected}` : ""}, ${reviewSummaryCountsLabel(item)}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`lab-review-row-${item.documentId}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.safeDisplayFilename}
        </Text>
        <Text style={styles.meta}>
          {statusLabel}
          {item.laboratoryName ? ` · ${item.laboratoryName}` : ""}
        </Text>
        <Text style={styles.meta}>
          {collected ? `Collected ${collected}` : reported ? `Reported ${reported}` : "Dates pending"}
          {fasting ? ` · ${fasting}` : ""}
        </Text>
        <Text style={styles.counts} testID={`lab-review-row-counts-${item.documentId}`}>
          {reviewSummaryCountsLabel(item)}
        </Text>
      </View>
      <Text style={styles.chevron}>{"\u203A"}</Text>
    </Pressable>
  );
}

export function LabReviewQueueContent({
  status,
  error,
  requestId,
  items = [],
  onRetry,
  onPressReview,
}: LabReviewQueueContentProps) {
  if (status === "partial") {
    return <LoadingState message="Loading reviews…" testID="lab-reviews-loading" />;
  }
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load reviews"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
        testID="lab-reviews-error"
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No lab reports yet"
        description="Imported lab reports will appear here with their collection dates."
        testID="lab-reviews-empty"
      />
    );
  }

  return (
    <View style={styles.card} testID="lab-reviews-list">
      <Text style={styles.listHint} accessibilityRole="text">
        Your imported lab reports and source details.
      </Text>
      {items.map((item) => (
        <ReviewRow key={item.documentId} item={item} onPress={() => onPressReview(item.documentId)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    overflow: "hidden",
    gap: 0,
  },
  listHint: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  rowPressed: { opacity: 0.9 },
  rowMain: { flex: 1, gap: 2, minWidth: 0 },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_SECONDARY,
  },
  counts: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
});
