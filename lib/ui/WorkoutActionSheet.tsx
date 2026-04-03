import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";

export type WorkoutActionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WorkoutActionSheetProps = {
  visible: boolean;
  anchor: WorkoutActionAnchor | null;
  onClose: () => void;
  onViewDetails: () => void;
  onDoItAgain: () => void;
  /** Strength day detail: open workout-specific exercise editor when journal has exercises. */
  onEditExercises?: () => void;
  onRename: () => void;
  onEditDuration: () => void;
  onEditType: () => void;
};

function Row({
  label,
  icon,
  onPress,
  showDivider = true,
  accessibilityLabel,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  showDivider?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color="#1C1C1E" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
  );
}

export function WorkoutActionSheet({
  visible,
  anchor,
  onClose,
  onViewDetails,
  onDoItAgain,
  onEditExercises,
  onRename,
  onEditDuration,
  onEditType,
}: WorkoutActionSheetProps) {
  if (!visible) return null;
  const screenWidth = 390;
  const screenHeight = 844;
  const popoverWidth = 252;
  const margin = 10;
  const anchorX = anchor?.x ?? screenWidth - margin - 36;
  const anchorY = anchor?.y ?? 120;
  const anchorH = anchor?.height ?? 28;
  const left = Math.max(margin, Math.min(anchorX - popoverWidth + 28, screenWidth - popoverWidth - margin));
  const top = Math.max(margin + 44, Math.min(anchorY + anchorH + 8, screenHeight - 320));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close workout menu">
        <Pressable style={[styles.sheet, { width: popoverWidth, left, top }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.section}>
            <Row
              label="View details"
              icon="information-circle-outline"
              onPress={onViewDetails}
              accessibilityLabel="View details"
            />
            <Row
              label="Do it again"
              icon="refresh-outline"
              onPress={onDoItAgain}
              showDivider={onEditExercises != null}
              accessibilityLabel="Do it again"
            />
            {onEditExercises != null ? (
              <Row
                label="Edit exercises"
                icon="list-outline"
                onPress={onEditExercises}
                showDivider={false}
                accessibilityLabel="Edit exercises"
              />
            ) : null}
          </View>
          <View style={styles.section}>
            <Row
              label="Rename workout"
              icon="create-outline"
              onPress={onRename}
              accessibilityLabel="Rename workout"
            />
            <Row
              label="Edit duration"
              icon="time-outline"
              onPress={onEditDuration}
              accessibilityLabel="Edit duration"
            />
            <Row
              label="Edit workout type"
              icon="barbell-outline"
              onPress={onEditType}
              showDivider={false}
              accessibilityLabel="Edit workout type"
            />
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancelSection, pressed && styles.rowPressed]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  sheet: {
    position: "absolute",
    gap: 8,
  },
  section: {
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  row: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    position: "relative",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLabel: {
    fontSize: 17,
    color: "#1C1C1E",
    fontWeight: "500",
  },
  rowDivider: {
    position: "absolute",
    left: 46,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(60,60,67,0.24)",
  },
  cancelSection: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 22,
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
  },
  rowPressed: {
    opacity: 0.7,
  },
});
