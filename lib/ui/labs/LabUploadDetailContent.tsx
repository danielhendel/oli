// lib/ui/labs/LabUploadDetailContent.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { formatLabUploadDate, labUploadStatusLabel } from "@/lib/ui/labs/labUploadStatusLabel";
import { formatLabResultValue } from "@/lib/labs/labMetricCatalog";
import {
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
};

export function LabUploadDetailContent({
  status,
  error,
  requestId,
  data,
  onRetry,
}: LabUploadDetailContentProps) {
  if (status === "partial") return <LoadingState message="Loading upload…" />;
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load upload"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  const upload = data!.upload;

  return (
    <View style={styles.root} testID="lab-upload-detail">
      <View style={styles.card}>
        <Text style={styles.title}>{upload.fileName}</Text>
        <Text style={styles.meta}>Status: {labUploadStatusLabel(upload.status)}</Text>
        <Text style={styles.meta}>Uploaded {formatLabUploadDate(upload.uploadedAt)}</Text>
        {upload.labDate ? <Text style={styles.meta}>Lab date {formatLabUploadDate(upload.labDate)}</Text> : null}
        <Text style={styles.meta}>
          {upload.matchedCount} matched · {upload.unmatchedCount} unmatched · {upload.extractedCount} total
        </Text>
        {upload.errorMessage ? <Text style={styles.error}>{upload.errorMessage}</Text> : null}
      </View>

      {data!.resultsByCategory.map((group) => (
        <View key={group.categoryKey} style={styles.card}>
          <Text style={styles.sectionTitle}>{group.displayName}</Text>
          {group.results.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <Text style={styles.resultName}>{r.displayName}</Text>
              <Text style={styles.resultValue}>
                {formatLabResultValue(r.value, r.unit, {
                  ...(r.rawValueText !== undefined ? { rawValueText: r.rawValueText } : {}),
                })}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {data!.unmatchedResults.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Needs review</Text>
          <Text style={styles.hint}>These labels could not be matched to the Oli lab catalog.</Text>
          {data!.unmatchedResults.map((r) => (
            <View key={r.id} style={styles.resultRow}>
              <Text style={styles.resultName}>{r.rawName}</Text>
              <Text style={styles.resultValue}>
                {formatLabResultValue(r.value, r.unit, {
                  ...(r.rawValueText !== undefined ? { rawValueText: r.rawValueText } : {}),
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Original file</Text>
        <Text style={styles.meta}>MIME: {upload.mimeType}</Text>
        <Text style={styles.meta} numberOfLines={2}>
          Storage: {upload.storagePath}
        </Text>
        {data!.pdfUrl ? (
          <Text style={styles.meta}>PDF link available</Text>
        ) : (
          <Text style={styles.hint}>Signed PDF download — follow-up sprint</Text>
        )}
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
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  error: {
    fontSize: 14,
    color: "#FF9F0A",
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
});
