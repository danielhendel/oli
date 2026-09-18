import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  BODY_APPLE_HEALTH_CONNECT_METRICS,
  buildAppleHealthBodyConnectSheetCopy,
  type AppleHealthBodyConnectSheetPhase,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { BodyAppleHealthSourceIcon } from "@/lib/ui/body/BodyAppleHealthSourceIcon";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_OVERLAY,
  UI_PANEL_SURFACE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyAppleHealthConnectSheetProps = {
  visible: boolean;
  phase: AppleHealthBodyConnectSheetPhase;
  onClose: () => void;
  onPrimary: () => void;
  onSyncLatest?: () => void;
  onReviewAccess?: () => void;
  onManageInSettings?: () => void;
  /** Optional factual progress line (e.g. imported count) — never fabricated %. */
  detailLine?: string | null;
};

/**
 * In-context Body Composition Apple Health connection sheet.
 * Does not navigate to the full Devices Apple Health page as the primary flow.
 */
export function BodyAppleHealthConnectSheet(props: BodyAppleHealthConnectSheetProps) {
  const insets = useSafeAreaInsets();
  const copy = buildAppleHealthBodyConnectSheetCopy(props.phase);
  const busy =
    props.phase === "requestingPermission" ||
    props.phase === "findingLatest" ||
    props.phase === "importingRecent" ||
    props.phase === "importingEarlier";

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
      testID="body-apple-health-connect-sheet"
    >
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.backdrop}
          onPress={props.onClose}
          accessibilityLabel="Dismiss Apple Health connection"
        />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} accessibilityElementsHidden />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.titleRow}>
              <BodyAppleHealthSourceIcon color={BODY_INDIGO} decorative />
              <Text
                style={styles.title}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                {copy.title}
              </Text>
            </View>

            {copy.body ? <Text style={styles.body}>{copy.body}</Text> : null}

            {copy.showMetricList ? (
              <View style={styles.metricList} accessibilityRole="list">
                {BODY_APPLE_HEALTH_CONNECT_METRICS.map((metric) => (
                  <View key={metric} style={styles.metricRow}>
                    <Text style={styles.metricBullet}>•</Text>
                    <Text style={styles.metricText}>{metric}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {copy.progressLabel ? (
              <View
                style={styles.progressBlock}
                accessibilityLiveRegion="polite"
                accessibilityLabel={copy.progressLabel}
              >
                {busy ? <ActivityIndicator color={BODY_INDIGO} /> : null}
                <Text style={styles.progressText}>{copy.progressLabel}</Text>
              </View>
            ) : null}

            {props.detailLine ? (
              <Text style={styles.detailLine}>{props.detailLine}</Text>
            ) : null}

            {copy.footer ? <Text style={styles.footer}>{copy.footer}</Text> : null}

            {copy.showSyncLatest && props.onSyncLatest ? (
              <Pressable
                style={styles.linkBtn}
                onPress={props.onSyncLatest}
                accessibilityRole="button"
                accessibilityLabel="Sync latest Body measurements"
                testID="body-ah-sheet-sync-latest"
              >
                <Text style={styles.linkText}>Sync latest</Text>
              </Pressable>
            ) : null}

            {copy.showReviewAccess && props.onReviewAccess ? (
              <Pressable
                style={styles.linkBtn}
                onPress={props.onReviewAccess}
                accessibilityRole="button"
                accessibilityLabel="Review Apple Health access"
                testID="body-ah-sheet-review-access"
              >
                <Text style={styles.linkText}>Review access</Text>
              </Pressable>
            ) : null}

            {copy.showManageInSettings && props.onManageInSettings ? (
              <Pressable
                style={styles.linkBtn}
                onPress={props.onManageInSettings}
                accessibilityRole="button"
                accessibilityLabel="Manage Apple Health in Settings"
                testID="body-ah-sheet-manage-settings"
              >
                <Text style={styles.linkText}>Manage in Settings</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {copy.primaryLabel ? (
            <Pressable
              style={[styles.primaryBtn, copy.primaryDisabled && styles.primaryDisabled]}
              onPress={props.onPrimary}
              disabled={copy.primaryDisabled}
              accessibilityRole="button"
              accessibilityLabel={copy.primaryLabel}
              accessibilityState={{ disabled: copy.primaryDisabled }}
              testID="body-ah-sheet-primary"
            >
              <Text style={styles.primaryLabel}>{copy.primaryLabel}</Text>
            </Pressable>
          ) : null}

          {copy.secondaryLabel ? (
            <Pressable
              style={styles.secondaryBtn}
              onPress={props.onClose}
              accessibilityRole="button"
              accessibilityLabel={copy.secondaryLabel}
              testID="body-ah-sheet-secondary"
            >
              <Text style={styles.secondaryLabel}>{copy.secondaryLabel}</Text>
            </Pressable>
          ) : null}
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
    backgroundColor: UI_PANEL_SURFACE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    marginBottom: 12,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
  },
  body: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
  },
  metricList: {
    gap: 6,
    paddingVertical: 4,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 28,
  },
  metricBullet: {
    color: BODY_INDIGO,
    fontSize: 16,
    fontWeight: "700",
  },
  metricText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  progressBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  progressText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  detailLine: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  linkBtn: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: BODY_INDIGO,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryDisabled: {
    opacity: 0.55,
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
