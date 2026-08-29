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
  | "errorRetryKind"
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
    errorRetryKind,
    refresh,
    requestExport,
    downloadExport,
  } = props;

  const showRequestSlot =
    exportState.status === "idle" ||
    exportState.status === "failed" ||
    exportState.status === "expired" ||
    requesting;

  const canPressRequest = showRequestSlot && !requesting && !loading;

  const showDownload = exportState.status === "ready" && exportState.packageAvailable;
  const failureCopy =
    exportState.status === "failed" ? failureExplanation(exportState.failureCategory) : null;

  const requestLabel =
    exportState.status === "failed" || exportState.status === "expired"
      ? "Request new export"
      : "Request export";

  const showRetry = Boolean(error && errorRetryable && errorRetryKind);
  const retryLabel =
    errorRetryKind === "download"
      ? "Retry download"
      : errorRetryKind === "refresh"
        ? "Retry status refresh"
        : "Retry";
  const retryAccessibilityLabel =
    errorRetryKind === "download"
      ? "Retry opening export"
      : errorRetryKind === "refresh"
        ? "Retry export status refresh"
        : "Retry";
  const onRetry = () => {
    if (errorRetryKind === "download") {
      void downloadExport();
      return;
    }
    if (errorRetryKind === "refresh") {
      refresh();
      return;
    }
    if (errorRetryKind === "request") {
      void requestExport();
    }
  };

  return (
    <View style={styles.card} testID="your-data-export-card" accessibilityRole="summary">
      <Text style={styles.title}>Personal data export</Text>
      <View style={styles.explanationBlock} testID="your-data-export-explanation">
        <Text
          style={styles.body}
          allowFontScaling
          maxFontSizeMultiplier={1.35}
          testID="your-data-export-explanation-line-1"
        >
          Request a copy of the data currently covered by Oli&apos;s export system.
        </Text>
        <Text
          style={styles.body}
          allowFontScaling
          maxFontSizeMultiplier={1.35}
          testID="your-data-export-explanation-line-2"
        >
          Processing is asynchronous.
        </Text>
        <Text
          style={styles.body}
          allowFontScaling
          maxFontSizeMultiplier={1.35}
          testID="your-data-export-explanation-line-3"
        >
          You can leave this screen and return later.
        </Text>
      </View>
      <Text
        style={styles.disclosure}
        allowFontScaling
        maxFontSizeMultiplier={1.35}
        testID="your-data-export-coverage-disclosure"
      >
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
        <Text style={styles.statusLabel} allowFontScaling maxFontSizeMultiplier={1.35}>
          {statusLabel(exportState.status)}
        </Text>
        {failureCopy ? (
          <Text
            style={styles.statusMeta}
            allowFontScaling
            maxFontSizeMultiplier={1.35}
            testID="your-data-export-failure-copy"
          >
            {failureCopy}
          </Text>
        ) : null}
        {exportState.requestedAt ? (
          <Text style={styles.statusMeta} allowFontScaling maxFontSizeMultiplier={1.35}>
            Requested {formatWhen(exportState.requestedAt)}
          </Text>
        ) : null}
        {exportState.expiresAt && exportState.status === "ready" ? (
          <Text style={styles.statusMeta} allowFontScaling maxFontSizeMultiplier={1.35}>
            Available until {formatWhen(exportState.expiresAt)}
          </Text>
        ) : null}
        {loading ? <ActivityIndicator color={UI_TEXT_PRIMARY} style={styles.spinner} /> : null}
      </View>

      {error ? (
        <Text
          style={styles.error}
          allowFontScaling
          maxFontSizeMultiplier={1.35}
          testID="your-data-export-error"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}

      {showRequestSlot ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={requesting ? "Requesting export" : "Request data export"}
          accessibilityState={{ disabled: !canPressRequest, busy: requesting }}
          testID="your-data-export-request"
          onPress={() => void requestExport()}
          disabled={!canPressRequest}
          style={({ pressed }) => [
            styles.button,
            !canPressRequest && styles.buttonDisabled,
            pressed && canPressRequest && styles.buttonPressed,
          ]}
        >
          {requesting ? (
            <View style={styles.buttonBusyRow}>
              <ActivityIndicator color={BUTTON_LABEL} />
              <Text style={styles.buttonText}>Requesting…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{requestLabel}</Text>
          )}
        </Pressable>
      ) : null}

      {showDownload ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={downloading ? "Opening export" : "Download or share export"}
          accessibilityState={{ disabled: downloading, busy: downloading }}
          testID="your-data-export-download"
          onPress={() => void downloadExport()}
          disabled={downloading}
          style={({ pressed }) => [
            styles.buttonSecondary,
            downloading && styles.buttonDisabled,
            pressed && !downloading && styles.buttonPressed,
          ]}
        >
          {downloading ? (
            <View style={styles.buttonBusyRow}>
              <ActivityIndicator color={UI_TEXT_PRIMARY} />
              <Text style={styles.buttonSecondaryText}>Opening…</Text>
            </View>
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

      {showRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={retryAccessibilityLabel}
          testID="your-data-export-retry"
          onPress={onRetry}
          disabled={downloading || requesting || loading}
          style={({ pressed }) => [styles.link, pressed && styles.buttonPressed]}
        >
          <Text style={styles.linkText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Light CTA fill on dark theme — must not reuse near-white textPrimary as fill. */
const BUTTON_FILL = "#F7F8FA";
const BUTTON_LABEL = "#1C1C1E";

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    overflow: "visible",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    marginBottom: 10,
  },
  explanationBlock: {
    alignSelf: "stretch",
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  disclosure: {
    fontSize: 13,
    lineHeight: 19,
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  statusBox: {
    paddingVertical: 8,
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    marginBottom: 4,
  },
  statusMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: UI_TEXT_TERTIARY_LABEL,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  spinner: {
    marginTop: 6,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF9F0A",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: BUTTON_FILL,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonBusyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonSecondary: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: BUTTON_LABEL,
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
