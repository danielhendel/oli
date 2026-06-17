import React from "react";
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  UI_BORDER_STRONG,
  UI_OVERLAY,
  UI_PANEL_SURFACE,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type MetricLogRowMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MetricLogRowMenuProps = {
  visible: boolean;
  anchor: MetricLogRowMenuAnchor | null;
  onClose: () => void;
  onEdit?: (() => void) | null;
  onDelete?: (() => void) | null;
  editDisabledReason?: string | null;
  deleteDisabledReason?: string | null;
  deleteLabel?: string;
  editLabel?: string;
};

const MENU_PAD = 14;
const GAP_BELOW_ANCHOR = 10;
const ROW_MIN_HEIGHT = 52;
const UI_DESTRUCTIVE = "#FF3B30";

function MenuRow({
  label,
  icon,
  onPress,
  showDivider = true,
  accessibilityLabel,
  destructive,
  disabled,
  disabledReason,
  testID,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  showDivider?: boolean;
  accessibilityLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  testID: string;
}) {
  const labelColor = disabled ? UI_TEXT_SECONDARY : destructive ? UI_DESTRUCTIVE : UI_TEXT_PRIMARY;
  const iconColor = disabled ? UI_TEXT_SECONDARY : destructive ? UI_DESTRUCTIVE : UI_TEXT_PRIMARY;
  return (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled === true }}
      accessibilityHint={disabled ? (disabledReason ?? undefined) : destructive ? "Destructive action" : undefined}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.rowPressed, disabled && styles.rowDisabled]}
    >
      <View style={styles.rowInner}>
        <View style={[styles.iconCircle, destructive && !disabled && styles.iconCircleDestructive]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.labelWrap}>
          <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
          {disabled && disabledReason ? (
            <Text style={styles.disabledReason} numberOfLines={2}>
              {disabledReason}
            </Text>
          ) : null}
        </View>
      </View>
      {showDivider ? <View style={styles.rowDivider} /> : null}
    </Pressable>
  );
}

export function MetricLogRowMenu({
  visible,
  anchor,
  onClose,
  onEdit,
  onDelete,
  editDisabledReason,
  deleteDisabledReason,
  deleteLabel = "Delete",
  editLabel = "Edit",
}: MetricLogRowMenuProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const { width: windowWidth, height: windowHeight } =
    typeof Dimensions !== "undefined" && typeof Dimensions.get === "function"
      ? Dimensions.get("window")
      : { width: 390, height: 844 };
  const popoverWidth = Math.min(280, windowWidth - MENU_PAD * 2);
  const anchorX = anchor?.x ?? windowWidth - MENU_PAD - 36;
  const anchorY = anchor?.y ?? insets.top + 80;
  const anchorW = anchor?.width ?? 28;
  const anchorH = anchor?.height ?? 28;
  const anchorRight = anchorX + anchorW;
  let left = anchorRight - popoverWidth;
  left = Math.max(MENU_PAD, Math.min(left, windowWidth - popoverWidth - MENU_PAD));
  const rowCount = (onEdit != null ? 1 : 0) + (onDelete != null ? 1 : 0) + 1;
  const estimatedPanelHeight = rowCount * ROW_MIN_HEIGHT + 36;
  let top = anchorY + anchorH + GAP_BELOW_ANCHOR;
  const maxTop = Math.max(MENU_PAD + insets.top, windowHeight - estimatedPanelHeight - MENU_PAD);
  top = Math.min(top, maxTop);
  top = Math.max(MENU_PAD + insets.top, top);

  const editDisabled = onEdit == null || Boolean(editDisabledReason);
  const deleteDisabled = onDelete == null || Boolean(deleteDisabledReason);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close menu">
        <View style={[styles.panel, { top, left, width: popoverWidth }]} accessibilityViewIsModal>
          {onEdit != null ? (
            <MenuRow
              testID="metric-log-row-edit"
              label={editLabel}
              icon="create-outline"
              onPress={() => {
                onClose();
                onEdit();
              }}
              disabled={editDisabled}
              disabledReason={editDisabledReason ?? null}
              accessibilityLabel={editLabel}
            />
          ) : null}
          {onDelete != null ? (
            <MenuRow
              testID="metric-log-row-delete"
              label={deleteLabel}
              icon="trash-outline"
              onPress={() => {
                onClose();
                onDelete();
              }}
              destructive
              disabled={deleteDisabled}
              disabledReason={deleteDisabledReason ?? null}
              showDivider={false}
              accessibilityLabel={deleteLabel}
            />
          ) : null}
          <MenuRow
            testID="metric-log-row-cancel"
            label="Cancel"
            icon="close-outline"
            onPress={onClose}
            showDivider={false}
            accessibilityLabel="Cancel"
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: UI_OVERLAY,
  },
  panel: {
    position: "absolute",
    backgroundColor: UI_PANEL_SURFACE,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  row: {
    minHeight: ROW_MIN_HEIGHT,
    justifyContent: "center",
  },
  rowPressed: {
    backgroundColor: UI_SURFACE_PRESSED,
  },
  rowDisabled: {
    opacity: 0.72,
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(120,120,128,0.12)",
  },
  iconCircleDestructive: {
    backgroundColor: "rgba(255,59,48,0.12)",
  },
  labelWrap: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: "400",
    letterSpacing: -0.28,
  },
  disabledReason: {
    marginTop: 2,
    fontSize: 12,
    color: UI_TEXT_SECONDARY,
    lineHeight: 16,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_STRONG,
    marginLeft: 60,
  },
});
