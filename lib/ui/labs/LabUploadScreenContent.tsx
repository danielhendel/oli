// lib/ui/labs/LabUploadScreenContent.tsx
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { DocumentPickerAvailability } from "@/lib/data/labs/useLabUploadFlow";
import type { LabUploadFlowState } from "@/lib/data/labs/labUploadFlowTypes";
import { DOCUMENT_PICKER_UNAVAILABLE_MESSAGE } from "@/lib/labs/expoDocumentPicker";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_CARD_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type LabUploadScreenContentProps = {
  state: LabUploadFlowState;
  documentPickerAvailability: DocumentPickerAvailability;
  onPickPdf: () => void;
  onViewUpload?: () => void;
  onBackToLabs?: () => void;
};

export function LabUploadScreenContent({
  state,
  documentPickerAvailability,
  onPickPdf,
  onViewUpload,
  onBackToLabs,
}: LabUploadScreenContentProps) {
  const busy = state.phase === "picking" || state.phase === "uploading" || state.phase === "processing";
  const checking = documentPickerAvailability === "checking";
  const available = documentPickerAvailability === "available";
  const showRebuildFallback = documentPickerAvailability === "unavailable";
  const pickDisabled = busy || checking || showRebuildFallback;

  return (
    <View style={styles.root} testID="lab-upload-screen">
      <View style={styles.card}>
        <Text style={styles.title}>Upload lab PDF</Text>
        <Text style={styles.privacy} testID="lab-upload-privacy-note">
          Your lab PDF is stored securely and parsed into structured biomarkers.
        </Text>

        {checking ? (
          <Text style={styles.status} testID="lab-upload-checking">
            Checking PDF upload support…
          </Text>
        ) : null}

        {showRebuildFallback ? (
          <Text style={styles.rebuildNotice} testID="lab-upload-rebuild-notice">
            {DOCUMENT_PICKER_UNAVAILABLE_MESSAGE}
          </Text>
        ) : null}

        <Pressable
          onPress={onPickPdf}
          disabled={pickDisabled}
          accessibilityRole="button"
          accessibilityLabel="Pick PDF"
          testID="lab-upload-pick-pdf"
          style={({ pressed }) => [
            styles.pickButton,
            pressed && !pickDisabled ? styles.pickButtonPressed : null,
            pickDisabled && styles.pickButtonDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={UI_TEXT_PRIMARY} />
          ) : (
            <Text style={[styles.pickButtonText, !available && !checking ? styles.pickButtonTextMuted : null]}>
              Pick PDF
            </Text>
          )}
        </Pressable>

        {state.phase === "uploading" ? (
          <Text style={styles.status} testID="lab-upload-status-uploading">
            Uploading {state.fileName ?? "file"}…
          </Text>
        ) : null}
        {state.phase === "processing" ? (
          <Text style={styles.status} testID="lab-upload-status-processing">
            Processing biomarkers…
          </Text>
        ) : null}
        {state.phase === "success" ? (
          <View style={styles.successBox} testID="lab-upload-status-success">
            <Text style={styles.successTitle}>Upload complete</Text>
            <Text style={styles.status}>Your lab report is being parsed into biomarkers.</Text>
            {onViewUpload && state.uploadId ? (
              <Pressable onPress={onViewUpload} style={styles.cta} testID="lab-upload-view-upload">
                <Text style={styles.ctaText}>View upload</Text>
              </Pressable>
            ) : null}
            {onBackToLabs ? (
              <Pressable onPress={onBackToLabs} style={styles.secondaryCta} testID="lab-upload-back-to-labs">
                <Text style={styles.secondaryCtaText}>Back to Labs</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {state.phase === "error" ? (
          <Text style={styles.error} testID="lab-upload-status-error">
            {state.error ?? "Upload failed"}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 14,
    padding: 18,
    gap: 14,
    backgroundColor: UI_CARD_SURFACE,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  privacy: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_SECONDARY,
  },
  rebuildNotice: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF9F0A",
  },
  pickButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pickButtonPressed: { opacity: 0.9 },
  pickButtonDisabled: { opacity: 0.7 },
  pickButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  pickButtonTextMuted: {
    color: UI_TEXT_TERTIARY_LABEL,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_TERTIARY_LABEL,
  },
  successBox: { gap: 10 },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF9F0A",
  },
  cta: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  secondaryCta: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryCtaText: {
    fontSize: 15,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
});
