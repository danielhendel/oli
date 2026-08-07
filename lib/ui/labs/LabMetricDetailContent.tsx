// lib/ui/labs/LabMetricDetailContent.tsx
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { formatLabResultValue, formatLabReferenceRange } from "@/lib/labs/labMetricCatalog";
import {
  calculateLabMetricChange,
  formatLabMetricChangeCopy,
} from "@/lib/labs/history/calculateLabMetricChange";
import { buildLabReferenceOverlay } from "@/lib/labs/history/buildLabReferenceOverlay";
import { buildLabTrendSeries } from "@/lib/labs/history/buildLabTrendSeries";
import { evaluateLabSourceReferenceContext } from "@/lib/labs/sourceContext/evaluateLabSourceReferenceContext";
import {
  formatLabSourceReferenceRawCopy,
  formatLabSourceReferenceStatusCopy,
} from "@/lib/labs/sourceContext/formatLabSourceReferenceCopy";
import { formatLabUploadDate } from "@/lib/ui/labs/labUploadStatusLabel";
import { LabTrendChart } from "@/lib/ui/labs/LabTrendChart";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";
import type { LabHistoryPointDto, LabMetricDetailResponseDto } from "@/lib/contracts";

const COLLECTION_DATE_UNAVAILABLE = "Collection date unavailable";

export type LabMetricDetailContentProps = {
  status: "partial" | "error" | "ready";
  error?: string;
  requestId?: string | null;
  data?: LabMetricDetailResponseDto;
  acceptedHistory?: LabHistoryPointDto[];
  historyStatus?: "partial" | "error" | "ready";
  historyError?: string;
  onRetry?: () => void;
};

function formatCollectionDate(iso: string | null | undefined): string {
  if (!iso) return COLLECTION_DATE_UNAVAILABLE;
  return formatLabUploadDate(iso);
}

function measuredOrCalculatedLabel(
  value: LabHistoryPointDto["measuredOrCalculated"],
): string | null {
  if (value === "measured") return "Measured";
  if (value === "calculated") return "Calculated";
  return null;
}

function historyValueText(point: LabHistoryPointDto): string {
  if (point.displayValue?.trim()) return point.displayValue.trim();
  if (point.result.kind === "numeric") {
    const op =
      point.result.comparator === "eq"
        ? ""
        : point.result.comparator === "lt"
          ? "<"
          : point.result.comparator === "lte"
            ? "≤"
            : point.result.comparator === "gt"
              ? ">"
              : "≥";
    const unit = point.normalizedUnit ?? point.rawUnit;
    const base = `${op}${point.result.value}`;
    return unit && unit !== "none" ? `${base} ${unit}` : base;
  }
  if (
    point.result.kind === "qualitative" ||
    point.result.kind === "pattern" ||
    point.result.kind === "text"
  ) {
    return point.result.value;
  }
  return point.result.reason.replace(/_/g, " ");
}

function findCompatiblePriorFromAccepted(
  points: LabHistoryPointDto[],
): { latest: LabHistoryPointDto; prior: LabHistoryPointDto } | null {
  if (points.length < 2) return null;
  const latest = points[0]!;
  if (
    latest.result.kind !== "numeric" ||
    latest.result.comparator !== "eq" ||
    !latest.collectedAt
  ) {
    return null;
  }
  const prior = points.find((row, idx) => {
    if (idx === 0) return false;
    if (row.result.kind !== "numeric" || row.result.comparator !== "eq") return false;
    if (!row.collectedAt || !latest.collectedAt) return false;
    if ((row.normalizedUnit ?? row.rawUnit ?? "") !== (latest.normalizedUnit ?? latest.rawUnit ?? "")) {
      return false;
    }
    return true;
  });
  return prior ? { latest, prior } : null;
}

export function LabMetricDetailContent({
  status,
  error,
  requestId,
  data,
  acceptedHistory = [],
  historyStatus,
  historyError,
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
  const labDate = latest?.collectedAt ?? null;

  const latestSourceContext = useMemo(() => {
    const acceptedLatest = acceptedHistory[0] ?? null;
    if (acceptedLatest) {
      return evaluateLabSourceReferenceContext({
        result: acceptedLatest.result,
        rawReferenceRange: acceptedLatest.rawReferenceRange,
        normalizedFlag: acceptedLatest.normalizedFlag,
        laboratoryName:
          acceptedLatest.laboratoryName ?? latest?.laboratoryName ?? "Quest Diagnostics",
      });
    }
    if (latest && latest.value != null) {
      return evaluateLabSourceReferenceContext({
        result: { kind: "numeric", value: latest.value, comparator: "eq" },
        rawReferenceRange: refRange,
        normalizedFlag: latest.flag ?? null,
        laboratoryName: latest.laboratoryName ?? "Quest Diagnostics",
      });
    }
    return null;
  }, [acceptedHistory, latest, refRange]);

  const latestSourceStatusCopy = latestSourceContext
    ? formatLabSourceReferenceStatusCopy(latestSourceContext)
    : null;
  const latestSourceRawCopy = latestSourceContext
    ? formatLabSourceReferenceRawCopy(latestSourceContext, {
        unit: acceptedHistory[0]?.normalizedUnit ?? acceptedHistory[0]?.rawUnit ?? latest?.unit ?? null,
      })
    : null;

  const useAcceptedHistory = acceptedHistory.length > 0;
  const acceptedPair = useMemo(
    () => (useAcceptedHistory ? findCompatiblePriorFromAccepted(acceptedHistory) : null),
    [acceptedHistory, useAcceptedHistory],
  );

  const projectionHistory = data?.history ?? [];
  const priorCompatible = projectionHistory.find((row, idx) => {
    if (idx === 0 || !latest) return false;
    if (row.value == null || latest.value == null) return false;
    if (!row.collectedAt || !latest.collectedAt) return false;
    if ((row.unit ?? "") !== (latest.unit ?? "")) return false;
    const raw = row.rawValueText ?? "";
    const latestRaw = latest.rawValueText ?? "";
    if (/^[<>≤≥]/.test(raw) || /^[<>≤≥]/.test(latestRaw)) return false;
    return true;
  });

  const changeCopy = useMemo(() => {
    if (acceptedPair) {
      const change = calculateLabMetricChange({
        latest: {
          id: acceptedPair.latest.id,
          collectedAt: acceptedPair.latest.collectedAt!,
          result: acceptedPair.latest.result as {
            kind: "numeric";
            value: number;
            comparator: "eq";
          },
        },
        prior: {
          id: acceptedPair.prior.id,
          collectedAt: acceptedPair.prior.collectedAt!,
          result: acceptedPair.prior.result as {
            kind: "numeric";
            value: number;
            comparator: "eq";
          },
        },
      });
      return change
        ? formatLabMetricChangeCopy({
            change,
            unit: acceptedPair.latest.normalizedUnit ?? acceptedPair.latest.rawUnit,
          })
        : null;
    }
    if (
      latest &&
      priorCompatible &&
      latest.value != null &&
      priorCompatible.value != null &&
      latest.collectedAt &&
      priorCompatible.collectedAt
    ) {
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
    }
    return null;
  }, [acceptedPair, latest, priorCompatible]);

  const showAcceptedHistory = useAcceptedHistory;
  const showProjectionHistory = !showAcceptedHistory && projectionHistory.length > 0;

  const trendSeries = useMemo(() => {
    if (!useAcceptedHistory) return null;
    return buildLabTrendSeries({
      metricKey: data?.metricKey ?? acceptedHistory[0]?.canonicalMetricId ?? "metric",
      displayName: data?.displayName ?? null,
      historyPoints: acceptedHistory,
    });
  }, [acceptedHistory, data?.displayName, data?.metricKey, useAcceptedHistory]);

  const referenceOverlay = useMemo(() => {
    if (!trendSeries) return null;
    return buildLabReferenceOverlay({
      graphEligibility: trendSeries.graphEligibility,
      points: trendSeries.points,
    });
  }, [trendSeries]);

  const showTrendSection =
    trendSeries != null &&
    (trendSeries.graphEligibility === "numeric_graph" ||
      trendSeries.graphEligibility === "single_numeric_point");

  const timelineNote =
    trendSeries?.graphEligibility === "qualitative_timeline"
      ? "Qualitative results are shown in the history table below."
      : trendSeries?.graphEligibility === "pattern_timeline"
        ? "Pattern results are shown in the history table below."
        : trendSeries?.graphEligibility === "inequality_timeline"
          ? "Inequality results (such as less-than thresholds) are shown in the history table below."
          : null;

  return (
    <View style={styles.root} testID="lab-metric-detail">
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Latest result</Text>
        <Text style={styles.heroValue} testID="lab-metric-latest-value">
          {latestValue}
        </Text>
        {latestSourceStatusCopy ? (
          <Text style={styles.meta} testID="lab-metric-source-reference-status">
            {latestSourceStatusCopy}
          </Text>
        ) : null}
        {latestSourceRawCopy ? (
          <Text style={styles.meta} testID="lab-metric-source-reference-raw">
            {latestSourceRawCopy}
          </Text>
        ) : refRange ? (
          <Text style={styles.meta} testID="lab-metric-source-reference-raw">
            Reference: {refRange}
          </Text>
        ) : (
          <Text style={styles.meta} testID="lab-metric-source-reference-unavailable">
            Reference range not available in this report
          </Text>
        )}
        <Text style={styles.meta} testID="lab-metric-collected-at">
          {labDate
            ? `Collected ${formatLabUploadDate(labDate)}`
            : COLLECTION_DATE_UNAVAILABLE}
        </Text>
        {changeCopy ? (
          <Text style={styles.meta} testID="lab-metric-neutral-change">
            {changeCopy}
          </Text>
        ) : null}
      </View>

      {showTrendSection && trendSeries ? (
        <View style={styles.section} testID="lab-metric-trend">
          <Text style={styles.sectionTitle}>Trend</Text>
          <LabTrendChart series={trendSeries} referenceOverlay={referenceOverlay} />
        </View>
      ) : null}

      {timelineNote ? (
        <View style={styles.section} testID="lab-metric-trend-timeline-note">
          <Text style={styles.sectionTitle}>Trend</Text>
          <Text style={styles.bodyCopy}>{timelineNote}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What this means</Text>
        <Text style={styles.bodyCopy}>
          This biomarker is one data point from your lab work. Oli shows the value and reference range when
          available. It does not diagnose conditions or recommend treatment — talk with your clinician about what
          this result means for you.
        </Text>
      </View>

      {historyStatus === "error" && historyError ? (
        <Text style={styles.meta} testID="lab-metric-history-error">
          {historyError}
        </Text>
      ) : null}

      {showAcceptedHistory ? (
        <View style={styles.section} testID="lab-metric-accepted-history">
          <Text style={styles.sectionTitle}>History</Text>
          {acceptedHistory.map((row) => {
            const methodLabel = measuredOrCalculatedLabel(row.measuredOrCalculated);
            const tableOnly =
              row.trendEligibility === "qualitative" ||
              row.trendEligibility === "pattern" ||
              row.trendEligibility === "inequality_table_only";
            return (
              <View key={row.id} style={styles.trendRow}>
                <View style={styles.trendLeft}>
                  <Text style={styles.trendDate} testID={`lab-metric-history-date-${row.id}`}>
                    {formatCollectionDate(row.collectedAt)}
                  </Text>
                  {typeof row.sourcePage === "number" ? (
                    <Text style={styles.trendSubMeta}>Page {row.sourcePage}</Text>
                  ) : null}
                  {methodLabel ? (
                    <Text style={styles.trendSubMeta}>{methodLabel}</Text>
                  ) : null}
                  {row.laboratoryName ? (
                    <Text style={styles.trendSubMeta}>{row.laboratoryName}</Text>
                  ) : null}
                  {tableOnly ? (
                    <Text style={styles.trendSubMeta}>Shown in history table only</Text>
                  ) : null}
                </View>
                <Text style={styles.trendValue}>{historyValueText(row)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {showProjectionHistory ? (
        <View style={styles.section} testID="lab-metric-history">
          <Text style={styles.sectionTitle}>History</Text>
          {projectionHistory.map((row) => (
            <View key={row.id} style={styles.trendRow}>
              <Text style={styles.trendDate} testID={`lab-metric-history-date-${row.id}`}>
                {formatCollectionDate(row.collectedAt)}
              </Text>
              <Text style={styles.trendValue}>
                {formatLabResultValue(row.value, row.unit, {
                  ...(row.rawValueText !== undefined ? { rawValueText: row.rawValueText } : {}),
                })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!showAcceptedHistory && !showProjectionHistory && latest == null ? (
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
        <Text style={styles.meta}>
          {labDate
            ? `Collected ${formatLabUploadDate(labDate)}`
            : COLLECTION_DATE_UNAVAILABLE}
        </Text>
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
    alignItems: "flex-start",
    minHeight: 36,
    gap: 12,
  },
  trendLeft: {
    flex: 1,
    gap: 2,
  },
  trendDate: {
    fontSize: 14,
    color: UI_TEXT_SECONDARY,
  },
  trendSubMeta: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  trendValue: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    flexShrink: 0,
    maxWidth: "45%",
    textAlign: "right",
  },
});
