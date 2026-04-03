import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type BodyLogActionAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BodyLogActionSheetProps = {
  visible: boolean;
  anchor: BodyLogActionAnchor | null;
  onClose: () => void;
  onEditLog: () => void;
  onDeleteLog: () => void;
};

function Row({
  label,
  icon,
  onPress,
  showDivider = true,
  accessibilityLabel,
  destructive = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  showDivider?: boolean;
  accessibilityLabel: string;
  destructive?: boolean;
}) {
  const color = destructive ? "#D92D20" : "#1C1C1E";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      </View>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
  );
}

export function BodyLogActionSheet({
  visible,
  anchor,
  onClose,
  onEditLog,
  onDeleteLog,
}: BodyLogActionSheetProps) {
  if (!visible) return null;
  const screenWidth = 390;
  const screenHeight = 844;
  const popoverWidth = 252;
  const margin = 10;
  const anchorX = anchor?.x ?? screenWidth - margin - 36;
  const anchorY = anchor?.y ?? 120;
  const anchorH = anchor?.height ?? 28;
  const left = Math.max(
    margin,
    Math.min(anchorX - popoverWidth + 28, screenWidth - popoverWidth - margin),
  );
  const top = Math.max(margin + 44, Math.min(anchorY + anchorH + 8, screenHeight - 280));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close body log menu">
        <Pressable style={[styles.sheet, { width: popoverWidth, left, top }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.section}>
            <Row
              label="Edit log"
              icon="create-outline"
              onPress={onEditLog}
              accessibilityLabel="Edit log"
            />
            <Row
              label="Delete log"
              icon="trash-outline"
              onPress={onDeleteLog}
              showDivider={false}
              accessibilityLabel="Delete log"
              destructive
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
  rowLabelDestructive: {
    color: "#D92D20",
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
    color: "#007AFF",
  },
  rowPressed: {
    opacity: 0.7,
  },
});

