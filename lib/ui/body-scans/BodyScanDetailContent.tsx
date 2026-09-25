// lib/ui/body-scans/BodyScanDetailContent.tsx
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyScanDetailDto } from "@/lib/contracts";
import { buildBodyScanDetailSections } from "@/lib/data/body-scans/buildBodyScanDetailSections";
import { EmptyState, ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type BodyScanDetailAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
};

export type BodyScanDetailContentProps = {
  status: "partial" | "error" | "not_found" | "ready";
  error?: string;
  requestId?: string | null;
  scan?: BodyScanDetailDto;
  actions?: readonly BodyScanDetailAction[];
  actionErrorMessage?: string | null;
  onRetry?: () => void;
};

function DetailAction({ action }: { action: BodyScanDetailAction }) {
  return (
    <Pressable
      onPress={action.onPress}
      disabled={action.disabled === true}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      accessibilityState={{ disabled: action.disabled === true }}
      testID={action.testID}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
        action.disabled === true && styles.actionDisabled,
      ]}
    >
      <Text style={styles.actionLabel}>{action.label}</Text>
    </Pressable>
  );
}

export function BodyScanDetailContent({
  status,
  error,
  requestId,
  scan,
  actions = [],
  actionErrorMessage,
  onRetry,
}: BodyScanDetailContentProps) {
  const sections = useMemo(() => (scan ? buildBodyScanDetailSections(scan) : []), [scan]);

  if (status === "partial") return <LoadingState message="Loading scan…" />;
  if (status === "not_found") {
    return (
      <EmptyState
        title="Scan not available"
        description="This scan is no longer stored in your account."
        testID="body-scan-not-found"
      />
    );
  }
  if (status === "error" || !scan) {
    return (
      <ErrorState
        message={error ?? "Could not load this scan"}
        requestId={requestId ?? null}
        {...(onRetry ? { onRetry } : {})}
      />
    );
  }

  return (
    <View style={styles.root} testID="body-scan-detail">
      <View style={styles.header}>
        <Text style={styles.statusLabel} testID="body-scan-detail-status">
          {scan.statusLabel}
        </Text>
        {scan.safeWarnings.map((warning) => (
          <Text key={warning} style={styles.warning} testID="body-scan-detail-warning">
            {warning}
          </Text>
        ))}
      </View>

      {actionErrorMessage ? (
        <Text style={styles.actionError} testID="body-scan-action-error">
          {actionErrorMessage}
        </Text>
      ) : null}

      {scan.metrics.length === 0 ? (
        <EmptyState
          title="No measurements yet"
          description="Your report is stored. Review it to record the measurements it contains."
          testID="body-scan-detail-no-metrics"
        />
      ) : null}

      {sections.map((section) => (
        <View key={section.id} style={styles.section} testID={`body-scan-section-${section.id}`}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </Text>
          {section.note ? <Text style={styles.sectionNote}>{section.note}</Text> : null}
          <View style={styles.card}>
            {section.rows.map((row, index) => (
              <View
                key={row.key}
                style={[styles.row, index > 0 && styles.rowDivided]}
                accessibilityLabel={`${row.label}: ${row.valueText ?? "Not in this report"}`}
              >
                <Text style={styles.rowLabel} numberOfLines={2}>
                  {row.label}
                </Text>
                <View style={styles.rowValueGroup}>
                  <Text
                    style={row.valueText ? styles.rowValue : styles.rowValueMissing}
                    testID={`body-scan-row-value-${row.key}`}
                  >
                    {row.valueText ?? "Not in this report"}
                  </Text>
                  {row.corrected ? <Text style={styles.correctedTag}>Edited by you</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}

      {actions.length > 0 ? (
        <View style={styles.actions} testID="body-scan-detail-actions">
          {actions.map((action) => (
            <DetailAction key={action.testID} action={action} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 20, paddingBottom: 28 },
  header: { gap: 6 },
  statusLabel: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  warning: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  actionError: { color: UI_TEXT_PRIMARY, fontSize: 14 },
  section: { gap: 8 },
  sectionTitle: { color: UI_TEXT_PRIMARY, fontSize: 18, fontWeight: "700", letterSpacing: -0.2 },
  sectionNote: { color: UI_TEXT_SECONDARY, fontSize: 13 },
  card: { ...elevatedCardSurfaceStyle, paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
  },
  rowDivided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: UI_BORDER_HAIRLINE },
  rowLabel: { color: UI_TEXT_SECONDARY, fontSize: 14, flex: 1, minWidth: 0 },
  rowValueGroup: { alignItems: "flex-end", gap: 2 },
  rowValue: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  rowValueMissing: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 14 },
  correctedTag: { color: UI_TEXT_TERTIARY_LABEL, fontSize: 11 },
  actions: { gap: 10 },
  action: {
    ...elevatedCardSurfaceStyle,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  actionPressed: { opacity: 0.85 },
  actionDisabled: { opacity: 0.5 },
  actionLabel: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
});
