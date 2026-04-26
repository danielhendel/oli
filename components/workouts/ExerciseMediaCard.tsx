import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";

import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { Ionicons } from "@expo/vector-icons";
import { ExerciseMediaThumbnail } from "@/components/workouts/ExerciseMediaThumbnail";

export type ExerciseMediaCardProps = {
  testID?: string;
  title: string;
  /** Remote or file URI for preview */
  previewUri: string | null;
  slot: "image" | "video";
  uploading: boolean;
  onPressAddReplace: () => void;
  addReplaceAccessibilityLabel: string;
};

export function ExerciseMediaCard({
  testID,
  title,
  previewUri,
  slot,
  uploading,
  onPressAddReplace,
  addReplaceAccessibilityLabel,
}: ExerciseMediaCardProps): React.ReactElement {
  const hasPreview = previewUri != null && previewUri.trim().length > 0;

  return (
    <View style={[styles.card, elevatedCardSurfaceStyle]} testID={testID}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.previewWrap}>
        {uploading ? (
          <View style={styles.previewFrameUploading} accessibilityLabel="Uploading">
            <ActivityIndicator size="large" color={SYSTEM_ACCENT} />
            <Text style={styles.uploadingText}>Uploading…</Text>
          </View>
        ) : slot === "image" ? (
          <ExerciseMediaThumbnail
            size="preview"
            accessibilityLabel={hasPreview ? "Exercise image preview" : "No exercise image yet"}
            {...(hasPreview ? { imageUrl: previewUri! } : {})}
          />
        ) : hasPreview ? (
          <View style={styles.previewFrame} accessibilityLabel="Video attached">
            <Ionicons name="videocam" size={40} color={SYSTEM_ACCENT} />
            <Text style={styles.videoHint}>Video ready</Text>
          </View>
        ) : (
          <View style={styles.previewFrame} accessibilityLabel="No video yet">
            <Ionicons name="film-outline" size={36} color="#C7C7CC" />
            <Text style={styles.placeholderText}>No video yet</Text>
          </View>
        )}
      </View>
      <Pressable
        onPress={onPressAddReplace}
        disabled={uploading || Platform.OS === "web"}
        style={({ pressed }) => [
          styles.actionBtn,
          (uploading || Platform.OS === "web") && styles.actionBtnDisabled,
          pressed && !uploading && styles.actionBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={addReplaceAccessibilityLabel}
      >
        <Text style={styles.actionBtnText}>{hasPreview ? "Replace" : "Add"}</Text>
      </Pressable>
      {Platform.OS === "web" ? <Text style={styles.webHint}>Media upload is available on the mobile app.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
  },
  previewWrap: {
    width: "100%",
    alignSelf: "stretch",
  },
  previewFrame: {
    width: "100%",
    height: 228,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F4F4F6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  previewFrameUploading: {
    width: "100%",
    height: 228,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8E8ED",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  videoHint: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
  actionBtn: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: SYSTEM_ACCENT,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnPressed: {
    opacity: 0.88,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  webHint: {
    fontSize: 12,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
});
