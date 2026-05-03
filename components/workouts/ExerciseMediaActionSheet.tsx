import { UI_CARD_SURFACE, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

import type { ExerciseMediaSlot } from "@/lib/workouts/exercises/pickExerciseMedia";


type ExerciseMediaActionSheetProps = {
  testID?: string;
  visible: boolean;
  slot: ExerciseMediaSlot;
  hasExisting: boolean;
  onClose: () => void;
  onChooseLibrary: () => void;
  onUseCamera: () => void;
  onRemove: () => void;
};

function Row({
  label,
  icon,
  onPress,
  destructive,
  accessibilityLabel,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  destructive?: boolean;
  accessibilityLabel: string;
}) {
  const color = destructive ? "#D92D20" : UI_TEXT_PRIMARY;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.rowLabel, destructive && styles.rowDestructive]}>{label}</Text>
    </Pressable>
  );
}

export function ExerciseMediaActionSheet({
  testID,
  visible,
  slot,
  hasExisting,
  onClose,
  onChooseLibrary,
  onUseCamera,
  onRemove,
}: ExerciseMediaActionSheetProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const cameraLabel = slot === "image" ? "Take photo" : "Record video";

  return (
    <Modal testID={testID} visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close media options" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{slot === "image" ? "Exercise image" : "Exercise video"}</Text>
          <Row
            label="Choose from library"
            icon="images-outline"
            onPress={onChooseLibrary}
            accessibilityLabel="Choose from library"
          />
          <Row
            label={cameraLabel}
            icon={slot === "image" ? "camera-outline" : "videocam-outline"}
            onPress={onUseCamera}
            accessibilityLabel={cameraLabel}
          />
          {hasExisting ? (
            <Row
              label="Remove"
              icon="trash-outline"
              onPress={onRemove}
              destructive
              accessibilityLabel="Remove media"
            />
          ) : null}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(60,60,67,0.25)",
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  rowDestructive: {
    color: "#D92D20",
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 17,
    fontWeight: "700",
    color: SYSTEM_ACCENT,
  },
});
