// lib/ui/documents/DocumentListContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { DocumentListItemDto } from "@/lib/contracts";
import { buildDocumentListItemViewModel } from "@/lib/data/documents/documentViewModels";
import { formatLabUploadDate } from "@/lib/ui/labs/labUploadStatusLabel";

export type DocumentListContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  items?: DocumentListItemDto[];
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  onPressDocument: (documentId: string) => void;
};

function DocumentRow({
  item,
  onPress,
}: {
  item: DocumentListItemDto;
  onPress: () => void;
}) {
  const vm = buildDocumentListItemViewModel(item);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${vm.filename}, ${vm.statusLabel}, ${vm.uploadedDateLabel}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`document-row-${item.id}`}
    >
      <View style={styles.rowMain}>
        <Text style={styles.fileName} numberOfLines={1}>
          {vm.filename}
        </Text>
        <Text style={styles.meta}>
          {item.collectedAt ? (
            <>
              Collected {formatLabUploadDate(item.collectedAt)}
              {" · "}
              Uploaded {vm.uploadedDateLabel}
            </>
          ) : (
            <>
              {vm.domainLabel} · Uploaded {vm.uploadedDateLabel}
            </>
          )}
        </Text>
        <Text style={styles.meta}>{vm.statusLabel}</Text>
      </View>
      <Text style={styles.chevron}>{"\u203A"}</Text>
    </Pressable>
  );
}

export function DocumentListContent({
  status,
  error,
  requestId,
  items = [],
  emptyTitle = "No documents yet",
  emptyDescription = "Upload a supported file to store it securely.",
  onRetry,
  onPressDocument,
}: DocumentListContentProps) {
  if (status === "partial") return <LoadingState message="Loading documents…" />;
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load documents"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <View style={styles.list} testID="document-list">
      {items.map((item) => (
        <DocumentRow key={item.id} item={item} onPress={() => onPressDocument(item.id)} />
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
  fileName: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  meta: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  chevron: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 22, marginLeft: 8 },
});
