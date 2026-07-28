// lib/ui/labs/LabUploadDetailContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  buildLabReportDetailViewModel,
  type LabReportDetailViewModel,
} from "@/lib/data/labs/buildLabReportDetailViewModel";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { LabUploadDetailResponseDto } from "@/lib/contracts";

export type LabUploadDetailContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  data?: LabUploadDetailResponseDto;
  onRetry?: () => void;
  /** Optional injection for tests — production builds from `data`. */
  viewModel?: LabReportDetailViewModel;
};

export function LabUploadDetailContent({
  status,
  error,
  requestId,
  data,
  onRetry,
  viewModel: viewModelProp,
}: LabUploadDetailContentProps) {
  if (status === "partial") return <LoadingState message="Loading report…" />;
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load lab report"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  const vm = viewModelProp ?? buildLabReportDetailViewModel(data!);

  return (
    <View style={styles.root} testID="lab-report-detail">
      <View style={styles.card} testID="lab-report-detail-summary">
        <Text style={styles.title} accessibilityRole="header">
          {vm.filename}
        </Text>
        <Text style={styles.status} testID="lab-report-status">
          {vm.statusLabel}
        </Text>
        <Text style={styles.meta} testID="lab-report-uploaded-date">
          Uploaded {vm.uploadedDateLabel}
        </Text>
        {vm.labDateLabel ? (
          <Text style={styles.meta}>Lab date {vm.labDateLabel}</Text>
        ) : null}
        {vm.fileTypeLabel ? (
          <Text style={styles.meta} testID="lab-report-file-type">
            {vm.fileTypeLabel}
          </Text>
        ) : null}
        {vm.extractionMessage ? (
          <Text style={styles.extraction} testID="lab-report-extraction-message">
            {vm.extractionMessage}
          </Text>
        ) : null}
        {vm.showParserCounts && vm.parserCountsLabel ? (
          <Text style={styles.meta} testID="lab-report-parser-counts">
            {vm.parserCountsLabel}
          </Text>
        ) : null}
      </View>

      {vm.resultGroups.map((group) => (
        <View key={group.categoryKey} style={styles.card}>
          <Text style={styles.sectionTitle}>{group.displayName}</Text>
          {group.results.map((r) => (
            <View key={r.key} style={styles.resultRow}>
              <Text style={styles.resultName}>{r.displayName}</Text>
              <Text style={styles.resultValue}>{r.valueText}</Text>
            </View>
          ))}
        </View>
      ))}

      {vm.unmatchedResults.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Needs review</Text>
          <Text style={styles.hint}>These labels could not be matched to the Oli lab catalog.</Text>
          {vm.unmatchedResults.map((r) => (
            <View key={r.key} style={styles.resultRow}>
              <Text style={styles.resultName}>{r.displayName}</Text>
              <Text style={styles.resultValue}>{r.valueText}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card} testID="lab-report-original">
        <Text style={styles.sectionTitle}>{vm.originalReport.heading}</Text>
        <Text style={styles.meta}>{vm.originalReport.description}</Text>
        <Pressable
          disabled={vm.originalReport.actionDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: vm.originalReport.actionDisabled }}
          accessibilityLabel={vm.originalReport.accessibilityLabel}
          style={[styles.actionRow, vm.originalReport.actionDisabled && styles.actionDisabled]}
          testID="lab-report-view-original"
        >
          <Text
            style={[
              styles.actionLabel,
              vm.originalReport.actionDisabled && styles.actionLabelDisabled,
            ]}
          >
            {vm.originalReport.actionLabel}
          </Text>
          {vm.originalReport.actionAvailabilityLabel ? (
            <Text style={styles.comingSoon}>{vm.originalReport.actionAvailabilityLabel}</Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 15,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  status: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  extraction: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 36,
    gap: 12,
  },
  resultName: {
    flex: 1,
    fontSize: 15,
    color: UI_TEXT_PRIMARY,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
  actionRow: {
    marginTop: 4,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  actionLabelDisabled: {
    color: UI_TEXT_MUTED,
  },
  comingSoon: {
    fontSize: 13,
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
