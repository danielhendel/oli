// lib/ui/labs/LabMetricDetailContent.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { formatLabResultValue, formatLabReferenceRange } from "@/lib/labs/labMetricCatalog";
import { formatLabUploadDate } from "@/lib/ui/labs/labUploadStatusLabel";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { LabMetricDetailResponseDto } from "@/lib/contracts";

export type LabMetricDetailContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  data?: LabMetricDetailResponseDto;
  onRetry?: () => void;
};

export function LabMetricDetailContent({
  status,
  error,
  requestId,
  data,
  onRetry,
}: LabMetricDetailContentProps) {
  if (status === "partial") return <LoadingState message="Loading…" />;
  if (status === "error") {
    return (
      <ErrorState
        message={error ?? "Could not load metric"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  const latest = data?.latest ?? null;
  const latestValue = latest
    ? formatLabResultValue(latest.value, latest.unit, {
        ...(latest.rawValueText !== undefined ? { rawValueText: latest.rawValueText } : {}),
      })
    : "—";
  const refRange =
    latest != null
      ? formatLabReferenceRange({
          metricKey: latest.metricKey,
          value: latest.value,
          unit: latest.unit,
          referenceRangeLow: latest.referenceRangeLow ?? null,
          referenceRangeHigh: latest.referenceRangeHigh ?? null,
          referenceRangeText: latest.referenceRangeText ?? null,
        }) ?? data?.referenceRangeText ?? null
      : data?.referenceRangeText ?? null;
  const labDate = latest?.collectedAt ?? latest?.reportedAt ?? null;

  return (
    <View style={styles.root} testID="lab-metric-detail">
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Latest result</Text>
        <Text style={styles.heroValue} testID="lab-metric-latest-value">
          {latestValue}
        </Text>
        {refRange ? (
          <Text style={styles.meta}>Reference range: {refRange}</Text>
        ) : (
          <Text style={styles.meta}>Reference range not available</Text>
        )}
        {labDate ? <Text style={styles.meta}>Lab date: {formatLabUploadDate(labDate)}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this means</Text>
        <Text style={styles.bodyCopy}>
          This biomarker is one data point from your lab work. Oli shows the value and reference range when
          available. It does not diagnose conditions or recommend treatment — talk with your clinician about what
          this result means for you.
        </Text>
      </View>

      {data && data.history.length > 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trend</Text>
          {data.history.map((row) => (
            <View key={row.id} style={styles.trendRow}>
              <Text style={styles.trendDate}>{formatLabUploadDate(row.collectedAt ?? row.reportedAt ?? row.createdAt)}</Text>
              <Text style={styles.trendValue}>
                {formatLabResultValue(row.value, row.unit, {
                  ...(row.rawValueText !== undefined ? { rawValueText: row.rawValueText } : {}),
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : latest == null ? (
        <EmptyState title="No values yet" description="Upload a lab PDF or log this biomarker to see results here." />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Source</Text>
        <Text style={styles.bodyCopy}>
          {latest?.source === "lab_pdf"
            ? `Parsed from lab PDF upload${latest.uploadId ? ` (${latest.uploadId})` : ""}.`
            : "No source recorded yet."}
        </Text>
        {latest?.rawName ? (
          <Text style={styles.meta}>Original label: {latest.rawName}</Text>
        ) : null}
        {latest != null ? (
          <Text style={styles.meta}>Confidence: {Math.round(latest.confidence * 100)}%</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  heroCard: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_TERTIARY_LABEL,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  section: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  bodyCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 36,
    gap: 12,
  },
  trendDate: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  trendValue: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
});
