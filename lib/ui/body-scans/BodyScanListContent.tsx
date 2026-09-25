// lib/ui/body-scans/BodyScanListContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanListItemDto } from "@/lib/contracts";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import { formatLabUploadDate } from "@/lib/ui/labs/labUploadStatusLabel";

export type BodyScanListContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  items?: readonly BodyScanListItemDto[];
  onRetry?: () => void;
  onPressScan: (scanId: string) => void;
};

const SCAN_TYPE_LABELS: Record<BodyScanListItemDto["scanType"], string> = {
  dxa: "DXA",
  inbody: "InBody",
  evolt: "Evolt",
  bod_pod: "Bod Pod",
  other: "Scan",
};

export function BodyScanRow({
  item,
  onPress,
}: {
  item: BodyScanListItemDto;
  onPress: () => void;
}) {
  const typeLabel = SCAN_TYPE_LABELS[item.scanType];
  const dateLabel = item.performedAt
    ? `Scanned ${formatLabUploadDate(item.performedAt)}`
    : `Uploaded ${formatLabUploadDate(item.uploadedAt)}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel} scan, ${dateLabel}, ${item.statusLabel}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`body-scan-row-${item.id}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.title} numberOfLines={1}>
          {typeLabel}
          {item.deviceLabel ? ` · ${item.deviceLabel}` : ""}
        </Text>
        <Text style={styles.meta}>{dateLabel}</Text>
        <Text style={styles.meta} testID={`body-scan-status-${item.id}`}>
          {item.statusLabel}
        </Text>
      </View>
      <Text style={styles.chevron}>{"\u203A"}</Text>
    </Pressable>
  );
}

export function BodyScanListContent({
  status,
  error,
  requestId,
  items = [],
  onRetry,
  onPressScan,
}: BodyScanListContentProps) {
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
      <EmptyState
        title="No scans yet"
        description="Upload a DXA report to keep its measurements alongside the rest of your body composition."
        testID="body-scans-empty"
      />
    );
  }

  return (
    <View style={styles.list} testID="body-scan-list">
      {items.map((item) => (
        <BodyScanRow key={item.id} item={item} onPress={() => onPressScan(item.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 24 },
  row: {
    ...elevatedCardSurfaceStyle,
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
});
