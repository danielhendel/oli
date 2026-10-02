// lib/ui/body-scans/BodyScanCategoryHistoryContent.tsx
import React, { memo, useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

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
  onRetry?: () => void;
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
  const secondaryParts = [
    item.deviceLabel,
    statusLabel,
  ].filter((part): part is string => typeof part === "string" && part.length > 0);

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
  onRetry,
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

  if (items.length === 0) {
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

  return (
    <FlatList
      data={items as BodyScanListItemDto[]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      testID="body-scan-category-history-list"
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
  list: { paddingBottom: 24 },
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
});
