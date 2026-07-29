// lib/ui/documents/DocumentUploadFlowContent.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import type { DocumentUploadPhase } from "@/lib/data/documents/useDocumentUploadFlow";

export type DocumentUploadFlowContentProps = {
  phase: DocumentUploadPhase;
  errorMessage: string | null;
  onStart: () => void;
  onCancel: () => void;
  onReset: () => void;
  onDone?: () => void;
  domainLabel: string;
};

export function DocumentUploadFlowContent({
  phase,
  errorMessage,
  onStart,
  onCancel,
  onReset,
  onDone,
  domainLabel,
}: DocumentUploadFlowContentProps) {
  const busy = phase === "picking" || phase === "uploading" || phase === "processing";

  return (
    <View style={styles.root} testID="document-upload-flow">
      <View style={styles.card}>
        <Text style={styles.title}>Upload {domainLabel} document</Text>
        <Text style={styles.body}>
          Files are stored securely. Structured extraction is not available yet — originals are kept for
          future processing.
        </Text>

        {phase === "idle" ? (
          <Pressable
            onPress={onStart}
            accessibilityRole="button"
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
          </>
        ) : null}

        {phase === "success" ? (
          <>
            <Text style={styles.status} testID="document-upload-success">
              Stored securely
            </Text>
            <Pressable
              onPress={onDone ?? onReset}
              accessibilityRole="button"
              accessibilityLabel="Done"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              testID="document-upload-done"
            >
              <Text style={styles.primaryLabel}>Done</Text>
            </Pressable>
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
              accessibilityLabel="Done"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
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
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: UI_TEXT_PRIMARY,
    alignItems: "center",
  },
  primaryLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondary: { paddingVertical: 12, alignItems: "center" },
  secondaryLabel: { color: UI_TEXT_SECONDARY, fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.85 },
});
