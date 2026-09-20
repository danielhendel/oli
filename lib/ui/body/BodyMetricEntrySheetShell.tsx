import React, { useMemo } from "react";
import {
  Dimensions,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBodyMetricEntryKeyboard } from "@/lib/hooks/useBodyMetricEntryKeyboard";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import { resolveBodyMetricEntrySheetLayout } from "@/lib/ui/body/bodyMetricEntrySheetLayout";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_DASH_CATEGORY_CARD_RADIUS,
  UI_OVERLAY,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyMetricEntrySheetShellProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  primaryLabel?: string;
  savingLabel?: string;
  errorMessage?: string | null;
  children: React.ReactNode;
  testID?: string;
  /** Optional subtitle / imported correction help. */
  helpText?: string | null;
  /** Called after the modal presentation animation completes (preferred autofocus hook). */
  onPresented?: () => void;
};

/**
 * Shared premium bottom-sheet shell for Body metric manual entry.
 *
 * Two intentional states:
 * - Resting: content-height sheet, safe-area padding once, no dead gap
 * - Editing: single keyboard-height bottom inset (no KeyboardAvoidingView)
 */
export function BodyMetricEntrySheetShell(props: BodyMetricEntrySheetShellProps) {
  const insets = useSafeAreaInsets();
  const { keyboardHeight } = useBodyMetricEntryKeyboard(props.visible);
  const primaryLabel = props.primaryLabel ?? "Save measurement";
  const savingLabel = props.savingLabel ?? "Saving…";

  const layout = useMemo(() => {
    const windowHeight = Dimensions.get("window").height;
    return resolveBodyMetricEntrySheetLayout({
      keyboardHeight,
      safeAreaBottom: insets.bottom,
      windowHeight,
    });
  }, [keyboardHeight, insets.bottom]);

  const onRequestClose = () => {
    Keyboard.dismiss();
    props.onClose();
  };

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
      onShow={() => {
        props.onPresented?.();
      }}
      testID={props.testID ?? "body-metric-entry-sheet"}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={onRequestClose}
          accessibilityLabel="Dismiss measurement entry"
          accessibilityRole="button"
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: layout.bottomPadding,
              ...(layout.maxHeight != null ? { maxHeight: layout.maxHeight } : null),
            },
          ]}
          onStartShouldSetResponder={() => true}
          testID="body-metric-entry-sheet-panel"
          // Expose layout state for focused tests without brittle pixels.
          accessibilityHint={
            layout.keyboardVisible ? "keyboard-editing" : "keyboard-resting"
          }
        >
          <View style={styles.handle} accessibilityElementsHidden />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            style={styles.scroll}
            testID="body-metric-entry-sheet-scroll"
          >
            <Text
              style={styles.title}
              accessibilityRole="header"
              testID="body-metric-entry-sheet-title"
            >
              {props.title}
            </Text>
            {props.helpText ? (
              <Text style={styles.helpText} testID="body-metric-entry-sheet-help">
                {props.helpText}
              </Text>
            ) : null}

            <View style={styles.groupSurface} testID="body-metric-entry-sheet-group">
              {props.children}
            </View>

            <View style={styles.errorSlot} testID="body-metric-entry-sheet-error-slot">
              {props.errorMessage ? (
                <Text
                  style={styles.error}
                  accessibilityLiveRegion="polite"
                  accessibilityRole="alert"
                  testID="body-metric-entry-sheet-error"
                >
                  {props.errorMessage}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                props.onSave();
              }}
              disabled={!props.canSave}
              style={({ pressed }) => [
                styles.primaryBtn,
                !props.canSave && styles.primaryDisabled,
                pressed && props.canSave ? styles.primaryPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              accessibilityState={{ disabled: !props.canSave, busy: props.saving }}
              testID="body-metric-entry-sheet-save"
            >
              <Text style={styles.primaryLabel}>
                {props.saving ? savingLabel : primaryLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onRequestClose}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="body-metric-entry-sheet-cancel"
            >
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: UI_OVERLAY,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderTopLeftRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    borderTopRightRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    paddingHorizontal: 20,
    paddingTop: 10,
    // Resting height is content-driven — no percentage minHeight.
    flexGrow: 0,
    flexShrink: 1,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 14,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 4,
    flexGrow: 0,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  helpText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  groupSurface: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    backgroundColor: "rgba(0,0,0,0.22)",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  errorSlot: {
    minHeight: 18,
  },
  error: {
    color: "#FF8A80",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: BODY_INDIGO,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryPressed: {
    opacity: 0.88,
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
});
