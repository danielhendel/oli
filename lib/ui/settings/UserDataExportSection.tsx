/**
 * Your Data — personal data export section (Stage 1B).
 */

import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listExportCoverageGaps } from "@/lib/data/user-data/userDataRetentionRegistry";
import type { UserDataExportHookResult } from "@/lib/data/user-data/export/useUserDataExport";
import {
  UI_BORDER_SUBTLE,
  UI_PANEL_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type UserDataExportSectionProps = Pick<
  UserDataExportHookResult,
  | "exportState"
  | "loading"
  | "requesting"
  | "downloading"
  | "error"
  | "errorRetryable"
  | "refresh"
  | "requestExport"
  | "downloadExport"
>;

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function statusLabel(status: UserDataExportHookResult["exportState"]["status"]): string {
  switch (status) {
    case "idle":
      return "No export requested";
    case "requesting":
      return "Requesting export";
    case "pending":
      return "Export in progress";
    case "ready":
      return "Export ready";
    case "failed":
      return "Export could not be completed";
    case "expired":
      return "Export expired";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function failureExplanation(
  failureCategory: UserDataExportHookResult["exportState"]["failureCategory"],
): string | null {
  if (failureCategory === "stale_pending") {
    return "Your previous export could not be completed.";
  }
  if (failureCategory === "processing_failed" || failureCategory === "artifact_unavailable") {
    return "Your previous export could not be completed.";
  }
  if (failureCategory === "unknown") {
    return "Your previous export could not be completed.";
  }
  return null;
}

export function UserDataExportSection(props: UserDataExportSectionProps) {
  const gapCount = listExportCoverageGaps().length;
  const {
    exportState,
    loading,
    requesting,
    downloading,
    error,
    errorRetryable,
    refresh,
    requestExport,
    downloadExport,
  } = props;

  const canRequest =
    !requesting &&
    !loading &&
    (exportState.status === "idle" ||
      exportState.status === "failed" ||
      exportState.status === "expired");

  const showDownload = exportState.status === "ready" && exportState.packageAvailable;
  const failureCopy =
    exportState.status === "failed" ? failureExplanation(exportState.failureCategory) : null;

  return (
    <View style={styles.card} testID="your-data-export-card" accessibilityRole="summary">
      <Text style={styles.title}>Personal data export</Text>
      <Text style={styles.body}>
        Request a copy of the data currently covered by Oli&apos;s export system. Processing is
        asynchronous — you can leave this screen and return later.
      </Text>
      <Text style={styles.disclosure} testID="your-data-export-coverage-disclosure">
        {gapCount > 0
          ? `Your export includes the data currently covered by Oli's export system. ${gapCount} required data areas are not fully covered yet.`
          : "Your export includes the data currently covered by Oli's export system."}
      </Text>

      <View
        style={styles.statusBox}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Export status: ${statusLabel(exportState.status)}`}
        testID="your-data-export-status"
      >
        <Text style={styles.statusLabel}>{statusLabel(exportState.status)}</Text>
        {failureCopy ? (
          <Text style={styles.statusMeta} testID="your-data-export-failure-copy">
            {failureCopy}
          </Text>
        ) : null}
        {exportState.requestedAt ? (
          <Text style={styles.statusMeta}>Requested {formatWhen(exportState.requestedAt)}</Text>
        ) : null}
        {exportState.expiresAt && exportState.status === "ready" ? (
          <Text style={styles.statusMeta}>Available until {formatWhen(exportState.expiresAt)}</Text>
        ) : null}
        {loading ? <ActivityIndicator color={UI_TEXT_PRIMARY} style={styles.spinner} /> : null}
      </View>

      {error ? (
        <Text style={styles.error} testID="your-data-export-error" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {canRequest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Request data export"
          testID="your-data-export-request"
          onPress={() => void requestExport()}
          disabled={requesting || loading}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          {requesting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {exportState.status === "failed" || exportState.status === "expired"
                ? "Request new export"
                : "Request export"}
            </Text>
          )}
        </Pressable>
      ) : null}

      {showDownload ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download or share export"
          testID="your-data-export-download"
          onPress={() => void downloadExport()}
          disabled={downloading}
          style={({ pressed }) => [styles.buttonSecondary, pressed && styles.buttonPressed]}
        >
          {downloading ? (
            <ActivityIndicator color={UI_TEXT_PRIMARY} />
          ) : (
            <Text style={styles.buttonSecondaryText}>Download / share</Text>
          )}
        </Pressable>
      ) : null}

      {(exportState.status === "pending" ||
        exportState.status === "ready" ||
        exportState.status === "failed" ||
        exportState.status === "expired") &&
      !loading ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh export status"
          testID="your-data-export-refresh"
          onPress={refresh}
          style={({ pressed }) => [styles.link, pressed && styles.buttonPressed]}
        >
          <Text style={styles.linkText}>Refresh export status</Text>
        </Pressable>
      ) : null}

      {error && errorRetryable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          testID="your-data-export-retry"
          onPress={
            exportState.status === "ready" ? () => void downloadExport() : () => void requestExport()
          }
          style={({ pressed }) => [styles.link, pressed && styles.buttonPressed]}
        >
          <Text style={styles.linkText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  disclosure: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  statusBox: {
    gap: 4,
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  statusMeta: {
    fontSize: 13,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  spinner: {
    marginTop: 6,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF9F0A",
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: UI_TEXT_PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonSecondary: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  link: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
});
