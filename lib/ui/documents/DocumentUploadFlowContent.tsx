// lib/ui/documents/DocumentUploadFlowContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_SURFACE_PRESSED,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";
import type { DocumentUploadPhase } from "@/lib/data/documents/useDocumentUploadFlow";
import type { DocumentUploadImportSummary } from "@/lib/data/documents/useDocumentUploadFlow";

/** Primary CTA fill — accent surface with high-contrast label. */
export const DOCUMENT_UPLOAD_PRIMARY_BG = SYSTEM_ACCENT;
export const DOCUMENT_UPLOAD_PRIMARY_LABEL = "#FFFFFF";
/** Disabled CTA — muted surface with readable muted text (never white-on-white). */
export const DOCUMENT_UPLOAD_DISABLED_BG = UI_SURFACE_PRESSED;
export const DOCUMENT_UPLOAD_DISABLED_LABEL = UI_TEXT_MUTED;
export const DOCUMENT_UPLOAD_MIN_TOUCH = 44;

export type DocumentUploadFlowContentProps = {
  phase: DocumentUploadPhase;
  errorMessage: string | null;
  onStart: () => void;
  onCancel: () => void;
  onReset: () => void;
  onDone?: () => void;
  onViewLabs?: () => void;
  onHowProcessed?: () => void;
  /** @deprecated Zero-user-work: optional corrections only — not a primary CTA. */
  onReviewItems?: () => void;
  domainLabel: string;
  terminalStatus?: string | null;
  importSummary?: DocumentUploadImportSummary | null;
};

function labsSuccessCopy(args: {
  terminalStatus: string | null;
  importSummary: DocumentUploadImportSummary | null;
}): {
  title: string;
  lines: string[];
  showViewLabs: boolean;
  showHowProcessed: boolean;
  showDoneOnly: boolean;
} {
  const summary = args.importSummary;
  if (args.terminalStatus === "unsupported") {
    return {
      title: "Stored securely",
      lines: ["Extraction unavailable for this format."],
      showViewLabs: false,
      showHowProcessed: false,
      showDoneOnly: true,
    };
  }
  if (args.terminalStatus === "failed") {
    return {
      title: "Processing failed",
      lines: [],
      showViewLabs: false,
      showHowProcessed: false,
      showDoneOnly: true,
    };
  }
  if (!summary) {
    return {
      title: "Report imported",
      lines: ["Oli is finishing processing. Open Labs to see available results."],
      showViewLabs: true,
      showHowProcessed: true,
      showDoneOnly: false,
    };
  }

  const available = summary.importedCount;
  const unsupported = summary.unmatchedCount;
  const withheld = Math.max(0, summary.withheldCount ?? 0);
  const verifying = Math.max(0, summary.verifyingCount ?? 0);
  const reportContent = Math.max(0, summary.reportContentCount ?? 0);
  const lines: string[] = [];
  if (available > 0 && verifying > 0) {
    lines.push(`${available} result${available === 1 ? "" : "s"} available now`);
    lines.push(
      `${verifying} additional result${verifying === 1 ? "" : "s"} ${verifying === 1 ? "is" : "are"} being verified`,
    );
  } else if (available > 0) {
    lines.push(
      unsupported === 0 && withheld === 0
        ? `All supported results were added to Labs`
        : `${available} result${available === 1 ? "" : "s"} added to Labs`,
    );
  }
  if (withheld > 0) {
    lines.push(
      `${withheld} result${withheld === 1 ? "" : "s"} could not be safely resolved`,
    );
  }
  if (unsupported > 0) {
    lines.push(
      `${unsupported} genuine result${unsupported === 1 ? "" : "s"} ${available > 0 ? "are not yet supported" : "could not be matched"}`,
    );
  }
  if (reportContent > 0) {
    lines.push(`Additional report content was preserved but was not treated as a lab result`);
  }

  return {
    title: available > 0 ? "Report imported" : "Stored securely",
    lines: lines.length > 0 ? lines : ["Oli processed this report."],
    showViewLabs: available > 0,
    showHowProcessed: true,
    showDoneOnly: available === 0,
  };
}

export function DocumentUploadFlowContent({
  phase,
  errorMessage,
  onStart,
  onCancel,
  onReset,
  onDone,
  onViewLabs,
  onHowProcessed,
  domainLabel,
  terminalStatus = null,
  importSummary = null,
}: DocumentUploadFlowContentProps) {
  const busy = phase === "picking" || phase === "uploading" || phase === "processing";
  const isLabs = domainLabel.toLowerCase() === "labs";
  const labsCopy = isLabs ? labsSuccessCopy({ terminalStatus, importSummary }) : null;
  const successLabel = labsCopy
    ? labsCopy.title
    : terminalStatus === "review_needed"
      ? "Stored securely"
      : terminalStatus === "structured"
        ? "Structured"
        : terminalStatus === "unsupported"
          ? "Stored — extraction unavailable for this format"
          : terminalStatus === "failed"
            ? "Processing failed"
            : "Stored securely";

  return (
    <View style={styles.root} testID="document-upload-flow">
      <View style={styles.card}>
        <Text style={styles.title}>Upload {domainLabel} document</Text>
        <Text style={styles.body}>
          {isLabs
            ? "Supported Quest lab PDFs are imported automatically. Oli verifies resolvable exceptions — you do not need to review each row."
            : "Files are stored securely. Supported Quest lab PDFs are extracted; unsupported formats keep the original for later processing."}
        </Text>

        {phase === "idle" ? (
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
            accessibilityLabel={`Choose ${domainLabel} file`}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            testID="document-upload-choose"
          >
            <Text style={styles.primaryLabel}>Choose file</Text>
          </Pressable>
        ) : null}

        {busy ? (
          <>
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {phase === "picking"
                ? "Opening file picker…"
                : phase === "uploading"
                  ? "Uploading…"
                  : "Processing…"}
            </Text>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel upload"
              style={styles.secondary}
              testID="document-upload-cancel"
            >
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Done"
              style={styles.primaryDisabled}
              testID="document-upload-done-disabled"
            >
              <Text style={styles.primaryDisabledLabel}>Done</Text>
            </Pressable>
          </>
        ) : null}

        {phase === "success" ? (
          <>
            <Text style={styles.status} testID="document-upload-success">
              {successLabel}
            </Text>
            {labsCopy?.lines.map((line) => (
              <Text key={line} style={styles.body} testID="document-upload-import-line">
                {line}
              </Text>
            ))}
            {labsCopy?.showViewLabs && onViewLabs ? (
              <Pressable
                onPress={onViewLabs}
                accessibilityRole="button"
                accessibilityLabel="View Labs"
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                testID="document-upload-view-labs"
              >
                <Text style={styles.primaryLabel}>View Labs</Text>
              </Pressable>
            ) : null}
            {labsCopy?.showHowProcessed && onHowProcessed ? (
              <Pressable
                onPress={onHowProcessed}
                accessibilityRole="button"
                accessibilityLabel="How Oli processed this report"
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                testID="document-upload-how-processed"
              >
                <Text style={styles.secondaryLabel}>How Oli processed this report</Text>
              </Pressable>
            ) : null}
            {labsCopy?.showDoneOnly || (!labsCopy?.showViewLabs && !labsCopy?.showHowProcessed) ? (
              <Pressable
                onPress={onDone ?? onReset}
                accessibilityRole="button"
                accessibilityState={{ disabled: false }}
                accessibilityLabel="Done"
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                testID="document-upload-done"
              >
                <Text style={styles.primaryLabel}>Done</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {phase === "duplicate" ? (
          <>
            <Text style={styles.status} testID="document-upload-duplicate">
              {errorMessage ?? "This report already exists in your account."}
            </Text>
            <Pressable
              onPress={onDone ?? onReset}
              accessibilityRole="button"
              accessibilityState={{ disabled: false }}
              accessibilityLabel="Done"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              testID="document-upload-done"
            >
              <Text style={styles.primaryLabel}>Done</Text>
            </Pressable>
          </>
        ) : null}

        {phase === "error" ? (
          <>
            <Text style={styles.error} testID="document-upload-error">
              {errorMessage ?? "Upload failed"}
            </Text>
            <Pressable
              onPress={onReset}
              accessibilityRole="button"
              accessibilityState={{ disabled: false }}
              accessibilityLabel="Try again"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              testID="document-upload-retry"
            >
              <Text style={styles.primaryLabel}>Try again</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: { ...elevatedCardSurfaceStyle, padding: 16, gap: 12 },
  title: { color: UI_TEXT_PRIMARY, fontSize: 18, fontWeight: "700" },
  body: { color: UI_TEXT_SECONDARY, fontSize: 14, lineHeight: 20 },
  status: { color: UI_TEXT_PRIMARY, fontSize: 15, fontWeight: "600" },
  error: { color: "#B42318", fontSize: 15 },
  primary: {
    marginTop: 4,
    minHeight: DOCUMENT_UPLOAD_MIN_TOUCH,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: DOCUMENT_UPLOAD_PRIMARY_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: DOCUMENT_UPLOAD_PRIMARY_LABEL, fontSize: 16, fontWeight: "700" },
  primaryDisabled: {
    marginTop: 4,
    minHeight: DOCUMENT_UPLOAD_MIN_TOUCH,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: DOCUMENT_UPLOAD_DISABLED_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryDisabledLabel: { color: DOCUMENT_UPLOAD_DISABLED_LABEL, fontSize: 16, fontWeight: "700" },
  secondary: {
    marginTop: 4,
    minHeight: DOCUMENT_UPLOAD_MIN_TOUCH,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_TEXT_MUTED,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { color: UI_TEXT_PRIMARY, fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
