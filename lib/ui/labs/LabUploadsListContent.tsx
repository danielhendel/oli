// lib/ui/labs/LabUploadsListContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { formatLabUploadDate, labUploadStatusLabel } from "@/lib/ui/labs/labUploadStatusLabel";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { LabUploadDto } from "@/lib/contracts";

export type LabUploadsListContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  items?: LabUploadDto[];
  onRetry?: () => void;
  onPressUpload: (uploadId: string) => void;
};

function UploadRow({ item, onPress }: { item: LabUploadDto; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.fileName}, ${labUploadStatusLabel(item.status)}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`lab-upload-row-${item.id}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.fileName}
        </Text>
        <Text style={styles.meta}>
          Uploaded {formatLabUploadDate(item.uploadedAt)}
          {item.labDate ? ` · Lab ${formatLabUploadDate(item.labDate)}` : ""}
        </Text>
        <Text style={styles.meta}>
          {labUploadStatusLabel(item.status)}
          {item.extractedCount > 0 ? ` · ${item.extractedCount} biomarkers` : ""}
        </Text>
      </View>
      <Text style={styles.chevron}>{"\u203A"}</Text>
    </Pressable>
  );
}

export function LabUploadsListContent({
  status,
  error,
  requestId,
  items = [],
  onRetry,
  onPressUpload,
}: LabUploadsListContentProps) {
  if (status === "partial") return <LoadingState message="Loading uploads…" />;
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load uploads"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No lab uploads yet"
        description="Upload a lab PDF from the Labs page to see reports here."
      />
    );
  }

  return (
    <View style={styles.card} testID="lab-uploads-list">
      {items.map((item) => (
        <UploadRow key={item.id} item={item} onPress={() => onPressUpload(item.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
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
  chevron: {
    fontSize: 16,
    color: UI_TEXT_MUTED,
    flexShrink: 0,
  },
  statusHint: {
    fontSize: 12,
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
