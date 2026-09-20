import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
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
};

/**
 * Shared premium bottom-sheet shell for Body metric manual entry.
 * Visual family matches {@link BodyAppleHealthConnectSheet}.
 */
export function BodyMetricEntrySheetShell(props: BodyMetricEntrySheetShellProps) {
  const insets = useSafeAreaInsets();
  const primaryLabel = props.primaryLabel ?? "Save measurement";
  const savingLabel = props.savingLabel ?? "Saving…";

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
      testID={props.testID ?? "body-metric-entry-sheet"}
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={props.onClose}
          accessibilityLabel="Dismiss measurement entry"
          accessibilityRole="button"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
          style={styles.keyboardWrap}
        >
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onStartShouldSetResponder={() => true}
            testID="body-metric-entry-sheet-panel"
          >
            <View style={styles.handle} accessibilityElementsHidden />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={false}
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
            </ScrollView>

            <Pressable
              onPress={props.onSave}
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
              onPress={props.onClose}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              testID="body-metric-entry-sheet-cancel"
            >
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
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
  keyboardWrap: {
    width: "100%",
  },
  sheet: {
    backgroundColor: UI_CARD_SURFACE,
    borderTopLeftRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    borderTopRightRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 14,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 10,
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
  error: {
    color: "#FF8A80",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: 8,
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
    marginTop: 4,
  },
  secondaryLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
});
