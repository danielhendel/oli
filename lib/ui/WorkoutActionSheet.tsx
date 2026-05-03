import React from "react";
import { Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  UI_BORDER_STRONG,
  UI_BORDER_SUBTLE,
  UI_OVERLAY,
  UI_PANEL_SURFACE,
  UI_SURFACE_PRESSED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

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
  /** When set, shows a destructive row (manual-ingest workouts only; caller decides eligibility). */
  onDeleteWorkout?: () => void;
};

const MENU_PAD = 14;
const GAP_BELOW_ANCHOR = 10;
const ROW_MIN_HEIGHT = 52;
/** System destructive red — consistent with existing workout delete styling. */
const UI_DESTRUCTIVE = "#FF3B30";

function Row({
  label,
  icon,
  onPress,
  showDivider = true,
  accessibilityLabel,
  destructive,
  testID,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  showDivider?: boolean;
  accessibilityLabel: string;
  destructive?: boolean;
  testID: string;
}) {
  const labelColor = destructive ? UI_DESTRUCTIVE : UI_TEXT_PRIMARY;
  const iconColor = destructive ? UI_DESTRUCTIVE : UI_TEXT_PRIMARY;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...(destructive ? { accessibilityHint: "Destructive action" } : {})}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowInner}>
        <View style={[styles.iconCircle, destructive && styles.iconCircleDestructive]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
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
  onDeleteWorkout,
}: WorkoutActionSheetProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const { width: windowWidth, height: windowHeight } =
    typeof Dimensions !== "undefined" && typeof Dimensions.get === "function"
      ? Dimensions.get("window")
      : { width: 390, height: 844 };
  const popoverWidth = Math.min(300, windowWidth - MENU_PAD * 2);
  const anchorX = anchor?.x ?? windowWidth - MENU_PAD - 36;
  const anchorY = anchor?.y ?? insets.top + 80;
  const anchorW = anchor?.width ?? 28;
  const anchorH = anchor?.height ?? 28;
  const anchorRight = anchorX + anchorW;
  let left = anchorRight - popoverWidth;
  left = Math.max(MENU_PAD, Math.min(left, windowWidth - popoverWidth - MENU_PAD));
  const rowCount =
    5 + (onEditExercises != null ? 1 : 0) + (onDeleteWorkout != null ? 1 : 0) + 1; /* cancel */
  const estimatedPanelHeight = rowCount * ROW_MIN_HEIGHT + 36;
  let top = anchorY + anchorH + GAP_BELOW_ANCHOR;
  const maxTop = Math.max(MENU_PAD + insets.top, windowHeight - estimatedPanelHeight - MENU_PAD);
  top = Math.min(top, maxTop);
  top = Math.max(MENU_PAD + insets.top, top);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot} accessibilityViewIsModal>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: UI_OVERLAY }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close workout actions"
        />
        <View style={styles.menuPositionLayer} pointerEvents="box-none">
          <View
            testID="oli-workout-action-menu"
            style={[
              styles.menuPanel,
              Platform.OS === "ios" && styles.menuPanelShadowIos,
              Platform.OS === "android" && styles.menuPanelShadowAndroid,
              { width: popoverWidth, left, top },
            ]}
          >
            <Row
              testID="workout-action-view-details"
              label="View details"
              icon="information-circle-outline"
              onPress={onViewDetails}
              accessibilityLabel="View details"
            />
            <Row
              testID="workout-action-do-it-again"
              label="Do it again"
              icon="refresh-outline"
              onPress={onDoItAgain}
              accessibilityLabel="Do it again"
            />
            {onEditExercises != null ? (
              <Row
                testID="workout-action-edit-exercises"
                label="Edit exercises"
                icon="list-outline"
                onPress={onEditExercises}
                showDivider
                accessibilityLabel="Edit exercises"
              />
            ) : null}
            <Row
              testID="workout-action-rename"
              label="Rename workout"
              icon="create-outline"
              onPress={onRename}
              accessibilityLabel="Rename workout"
            />
            <Row
              testID="workout-action-edit-duration"
              label="Edit duration"
              icon="time-outline"
              onPress={onEditDuration}
              accessibilityLabel="Edit duration"
            />
            <Row
              testID="workout-action-edit-type"
              label="Edit workout type"
              icon="barbell-outline"
              onPress={onEditType}
              showDivider={onDeleteWorkout != null}
              accessibilityLabel="Edit workout type"
            />
            {onDeleteWorkout != null ? (
              <Row
                testID="workout-action-delete"
                label="Delete Workout"
                icon="trash-outline"
                onPress={onDeleteWorkout}
                showDivider={false}
                destructive
                accessibilityLabel="Delete workout"
              />
            ) : null}
            <View style={styles.cancelTopRule} />
            <Pressable
              testID="workout-action-cancel"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [styles.cancelRow, pressed && styles.cancelRowPressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  menuPositionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  menuPanel: {
    position: "absolute",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_STRONG,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  menuPanelShadowIos: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  menuPanelShadowAndroid: {
    elevation: 18,
  },
  row: {
    position: "relative",
    minHeight: ROW_MIN_HEIGHT,
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  rowPressed: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: UI_SURFACE_PRESSED,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
  },
  iconCircleDestructive: {
    backgroundColor: UI_SURFACE_PRESSED,
    borderColor: UI_BORDER_SUBTLE,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  rowDivider: {
    position: "absolute",
    left: 62,
    right: 10,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_SUBTLE,
  },
  cancelTopRule: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_SUBTLE,
  },
  cancelRow: {
    minHeight: ROW_MIN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  cancelRowPressed: {
    opacity: 0.85,
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: UI_TEXT_SECONDARY,
  },
});
