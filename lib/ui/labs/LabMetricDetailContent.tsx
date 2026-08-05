// lib/ui/labs/LabMetricDetailContent.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { formatLabResultValue, formatLabReferenceRange } from "@/lib/labs/labMetricCatalog";
import {
  calculateLabMetricChange,
  formatLabMetricChangeCopy,
} from "@/lib/labs/history/calculateLabMetricChange";
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
  const history = data?.history ?? [];
  const priorCompatible = history.find((row, idx) => {
    if (idx === 0 || !latest) return false;
    if (row.value == null || latest.value == null) return false;
    if (!row.collectedAt || !latest.collectedAt) return false;
    if ((row.unit ?? "") !== (latest.unit ?? "")) return false;
    const raw = row.rawValueText ?? "";
    const latestRaw = latest.rawValueText ?? "";
    if (/^[<>≤≥]/.test(raw) || /^[<>≤≥]/.test(latestRaw)) return false;
    return true;
  });
  const changeCopy =
    latest &&
    priorCompatible &&
    latest.value != null &&
    priorCompatible.value != null &&
    latest.collectedAt &&
    priorCompatible.collectedAt
      ? (() => {
          const change = calculateLabMetricChange({
            latest: {
              id: latest.id,
              collectedAt: latest.collectedAt,
              result: { kind: "numeric", value: latest.value, comparator: "eq" },
            },
            prior: {
              id: priorCompatible.id,
              collectedAt: priorCompatible.collectedAt,
              result: { kind: "numeric", value: priorCompatible.value, comparator: "eq" },
            },
          });
          return change ? formatLabMetricChangeCopy({ change, unit: latest.unit }) : null;
        })()
      : null;

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
        {labDate ? (
          <Text style={styles.meta} testID="lab-metric-collected-at">
            Collected {formatLabUploadDate(labDate)}
          </Text>
        ) : null}
        {changeCopy ? (
          <Text style={styles.meta} testID="lab-metric-neutral-change">
            {changeCopy}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this means</Text>
        <Text style={styles.bodyCopy}>
          This biomarker is one data point from your lab work. Oli shows the value and reference range when
          available. It does not diagnose conditions or recommend treatment — talk with your clinician about what
          this result means for you.
        </Text>
      </View>

      {data && data.history.length > 0 ? (
        <View style={styles.section} testID="lab-metric-history">
          <Text style={styles.sectionTitle}>History</Text>
          {data.history.map((row) => (
            <View key={row.id} style={styles.trendRow}>
              <Text style={styles.trendDate}>
                {formatLabUploadDate(row.collectedAt ?? row.reportedAt ?? row.createdAt)}
              </Text>
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
        <Text style={styles.bodyCopy} testID="lab-metric-source-label">
          {latest?.publicationMode === "auto"
            ? "Imported automatically"
            : latest?.publicationMode === "user"
              ? "Imported from report"
              : latest?.source === "lab_pdf"
                ? "Imported from report"
                : "No source recorded yet."}
        </Text>
        {latest?.laboratoryName ? (
          <Text style={styles.meta}>Source: {latest.laboratoryName} report</Text>
        ) : latest?.source === "lab_pdf" ? (
          <Text style={styles.meta}>Source: Quest Diagnostics report</Text>
        ) : null}
        {labDate ? (
          <Text style={styles.meta}>Collected {formatLabUploadDate(labDate)}</Text>
        ) : null}
        {latest?.uploadId ? (
          <Text style={styles.meta}>Source report</Text>
        ) : null}
        {typeof latest?.sourcePage === "number" ? (
          <Text style={styles.meta}>Page {latest.sourcePage}</Text>
        ) : null}
        {refRange ? (
          <Text style={styles.meta}>Reference range from this report</Text>
        ) : null}
        {latest?.rawName ? (
          <Text style={styles.meta}>Original label: {latest.rawName}</Text>
        ) : null}
        {latest?.publicationMode === "auto" ? (
          <Text style={styles.bodyCopy} testID="lab-metric-auto-import-explain">
            Oli imported this result automatically because the report format, analyte, value, unit, and
            source were clear.
          </Text>
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
