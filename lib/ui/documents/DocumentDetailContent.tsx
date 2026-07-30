// lib/ui/documents/DocumentDetailContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { DocumentDetailDto } from "@/lib/contracts";
import { buildDocumentDetailViewModel } from "@/lib/data/documents/documentViewModels";
import type { DocumentDetailState } from "@/lib/data/documents/useDocumentDetail";

export const DOCUMENT_NOT_FOUND_TITLE = "Document no longer available";
export const DOCUMENT_NOT_FOUND_MESSAGE = "This document may have been deleted.";
export const DOCUMENT_NOT_FOUND_ACTION_LABEL = "Back to Lab uploads";

export type DocumentDetailContentProps = {
  status: DocumentDetailState | "partial";
  error?: string;
  requestId?: string | null;
  document?: DocumentDetailDto | null;
  onRetryLoad?: () => void;
  onBackToList?: () => void;
  onReprocess?: () => void;
  onDelete?: () => void;
  reprocessBusy?: boolean;
  deleteBusy?: boolean;
};

export function DocumentDetailContent({
  status,
  error,
  requestId,
  document,
  onRetryLoad,
  onBackToList,
  onReprocess,
  onDelete,
  reprocessBusy,
  deleteBusy,
}: DocumentDetailContentProps) {
  if (status === "idle" || status === "partial") {
    return <LoadingState message="Loading document…" />;
  }

  if (status === "not_found") {
    return (
      <View style={styles.root} testID="document-detail-not-found">
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            {DOCUMENT_NOT_FOUND_TITLE}
          </Text>
          <Text style={styles.message} testID="document-detail-not-found-message">
            {DOCUMENT_NOT_FOUND_MESSAGE}
          </Text>
        </View>
        {onBackToList ? (
          <Pressable
            onPress={onBackToList}
            accessibilityRole="button"
            accessibilityLabel={DOCUMENT_NOT_FOUND_ACTION_LABEL}
            style={({ pressed }) => [styles.primaryAction, pressed && styles.actionPressed]}
            testID="document-detail-back-to-list"
          >
            <Text style={styles.primaryActionLabel}>{DOCUMENT_NOT_FOUND_ACTION_LABEL}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (status === "error" || !document) {
    return (
      <ErrorState
        message={error ?? "Could not load document"}
        requestId={requestId ?? null}
        {...(onRetryLoad ? { onRetry: onRetryLoad } : {})}
      />
    );
  }

  const vm = buildDocumentDetailViewModel(document);

  return (
    <View style={styles.root} testID="document-detail">
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          {vm.title}
        </Text>
        <Text style={styles.filename} numberOfLines={2}>
          {vm.filename}
        </Text>
        <Text style={styles.meta}>
          {vm.domainLabel} · {vm.documentTypeLabel}
        </Text>
        <Text style={styles.meta}>Uploaded {vm.uploadedDateLabel}</Text>
        <Text style={styles.status} testID="document-detail-status">
          {vm.statusLabel}
        </Text>
        {vm.extractionMessage ? (
          <Text style={styles.message} testID="document-detail-extraction-message">
            {vm.extractionMessage}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{vm.originalFile.heading}</Text>
        <Text style={styles.meta}>{vm.originalFile.description}</Text>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={`${vm.originalFile.actionLabel}, Coming soon`}
          style={[styles.action, styles.actionDisabled]}
          testID="document-view-original"
        >
          <Text style={styles.actionLabelDisabled}>{vm.originalFile.actionLabel}</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </Pressable>
      </View>

      {vm.canRetryProcessing && onReprocess && vm.retryLabel ? (
        <Pressable
          onPress={onReprocess}
          disabled={reprocessBusy}
          accessibilityRole="button"
          accessibilityLabel={vm.retryLabel}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          testID="document-reprocess"
        >
          <Text style={styles.actionLabel}>{reprocessBusy ? "Retrying…" : vm.retryLabel}</Text>
        </Pressable>
      ) : null}

      {document.canDelete && onDelete ? (
        <Pressable
          onPress={onDelete}
          disabled={deleteBusy}
          accessibilityRole="button"
          accessibilityLabel="Delete document"
          style={({ pressed }) => [styles.action, styles.danger, pressed && styles.actionPressed]}
          testID="document-delete"
        >
          <Text style={styles.dangerLabel}>{deleteBusy ? "Deleting…" : "Delete document"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, paddingBottom: 32 },
  card: {
    ...elevatedCardSurfaceStyle,
    padding: 16,
    gap: 8,
  },
  title: { color: UI_TEXT_PRIMARY, fontSize: 20, fontWeight: "700" },
  filename: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  meta: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  status: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600", marginTop: 4 },
  message: { color: UI_TEXT_SECONDARY, fontSize: 14, marginTop: 4 },
  sectionTitle: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  action: {
    ...elevatedCardSurfaceStyle,
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: SYSTEM_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  actionPressed: { opacity: 0.85 },
  actionDisabled: { opacity: 0.7 },
  actionLabel: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  actionLabelDisabled: { color: UI_TEXT_SECONDARY, fontSize: 16, fontWeight: "600" },
  comingSoon: { color: UI_TEXT_SECONDARY, fontSize: 13, marginTop: 4 },
  danger: {},
  dangerLabel: { color: "#B42318", fontSize: 16, fontWeight: "600" },
});
