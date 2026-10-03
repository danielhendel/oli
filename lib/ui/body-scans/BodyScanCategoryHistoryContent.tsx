// lib/ui/body-scans/BodyScanCategoryHistoryContent.tsx
import React, { memo, useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanListItemDto } from "@/lib/contracts";
import {
  bodyScanHistoryAccessibilityLabel,
  bodyScanHistoryDateLabel,
} from "@/lib/data/body-scans/groupBodyScansByCategory";
import { bodyScanNavStatusLabel } from "@/lib/data/body-scans/bodyScanNavStatusLabel";
import type { BodyScanCategoryDefinition } from "@/lib/data/body-scans/bodyScanCategoryCatalog";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type BodyScanCategoryHistoryContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  category: BodyScanCategoryDefinition;
  items: readonly BodyScanListItemDto[];
  /** Empty claim only when first category page proves empty (hasMore false). */
  isProvenEmpty: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreError?: string | null;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onRetryLoadMore?: () => void;
  onPressScan: (scanId: string) => void;
  onPressAdd: () => void;
};

const ScanHistoryRow = memo(function ScanHistoryRow({
  item,
  onPress,
}: {
  item: BodyScanListItemDto;
  onPress: (scanId: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
  const dateLabel = bodyScanHistoryDateLabel(item);
  const statusLabel = bodyScanNavStatusLabel(item.status);
  const secondaryParts = [item.deviceLabel, statusLabel].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={bodyScanHistoryAccessibilityLabel(item)}
      accessibilityHint="Opens this scan"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`body-scan-history-row-${item.id}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.title} numberOfLines={2}>
          {dateLabel}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          {secondaryParts.join(" · ")}
        </Text>
      </View>
      <Text style={styles.chevron} importantForAccessibility="no">
        {"\u203A"}
      </Text>
    </Pressable>
  );
});

export function BodyScanCategoryHistoryContent({
  status,
  error,
  requestId,
  category,
  items,
  isProvenEmpty,
  hasMore = false,
  loadingMore = false,
  loadMoreError = null,
  onLoadMore,
  onRetry,
  onRetryLoadMore,
  onPressScan,
  onPressAdd,
}: BodyScanCategoryHistoryContentProps) {
  if (status === "partial") return <LoadingState message="Loading scans…" />;
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load scans"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  // Never claim empty while hasMore/incomplete — only when proven.
  if (isProvenEmpty) {
    return (
      <View style={styles.emptyWrap} testID="body-scan-category-empty">
        <EmptyState
          title={category.emptyTitle}
          description={category.emptyBody}
          testID="body-scan-category-empty-state"
        />
        <Pressable
          onPress={onPressAdd}
          accessibilityRole="button"
          accessibilityLabel={category.addLabel}
          style={({ pressed }) => [styles.addAction, pressed && styles.rowPressed]}
          testID="body-scan-category-empty-add"
        >
          <Text style={styles.addActionLabel}>{category.addLabel}</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    // Ready but not proven empty (should be rare) — show loading-safe state, not empty claim.
    return <LoadingState message="Loading scans…" />;
  }

  return (
    <FlatList
      style={styles.listRoot}
      data={items as BodyScanListItemDto[]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      testID="body-scan-category-history-list"
      onEndReached={() => {
        if (hasMore && !loadingMore && onLoadMore) onLoadMore();
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        <View style={styles.footer}>
          {loadingMore ? (
            <ActivityIndicator
              color={BODY_INDIGO}
              accessibilityLabel="Loading more scans"
              testID="body-scan-category-loading-more"
            />
          ) : null}
          {loadMoreError ? (
            <Pressable
              onPress={onRetryLoadMore ?? onLoadMore}
              accessibilityRole="button"
              accessibilityLabel="Retry loading more scans"
              style={styles.loadMoreBtn}
              testID="body-scan-category-load-more-retry"
            >
              <Text style={styles.loadMoreLabel}>Retry</Text>
            </Pressable>
          ) : null}
          {!loadingMore && hasMore && !loadMoreError && onLoadMore ? (
            <Pressable
              onPress={onLoadMore}
              accessibilityRole="button"
              accessibilityLabel="Load more scans"
              style={styles.loadMoreBtn}
              testID="body-scan-category-load-more"
            >
              <Text style={styles.loadMoreLabel}>Load more</Text>
            </Pressable>
          ) : null}
          {!hasMore && !loadingMore ? (
            <Text style={styles.endLabel} testID="body-scan-category-end">
              End of history
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item, index }) => (
        <View>
          {index > 0 ? <View style={styles.listGap} /> : null}
          <ScanHistoryRow item={item} onPress={onPressScan} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listRoot: { flex: 1, minHeight: 0 },
  list: { paddingBottom: 24, flexGrow: 1 },
  listGap: { height: 10 },
  row: {
    ...elevatedCardSurfaceStyle,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  rowPressed: { opacity: 0.85 },
  rowMain: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  meta: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  chevron: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 22, marginLeft: 8 },
  emptyWrap: { gap: 12 },
  addAction: {
    ...elevatedCardSurfaceStyle,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addActionLabel: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "700",
  },
  footer: { paddingVertical: 16, alignItems: "center", gap: 10 },
  loadMoreBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  loadMoreLabel: { color: BODY_INDIGO, fontSize: 15, fontWeight: "700" },
  endLabel: { color: UI_TEXT_SECONDARY, fontSize: 12 },
});
