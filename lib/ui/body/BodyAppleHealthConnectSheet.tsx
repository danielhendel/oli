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
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_DASH_CATEGORY_CARD_RADIUS,
  UI_DURATION_STATUS_RECOMMENDED_TEXT,
  UI_OVERLAY,
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
  detailLine?: string | null;
  historyStatusLabel?: string | null;
};

/**
 * Premium Body Composition Apple Health sheet — Category Card visual language.
 */
export function BodyAppleHealthConnectSheet(props: BodyAppleHealthConnectSheetProps) {
  const insets = useSafeAreaInsets();
  const copy = buildAppleHealthBodyConnectSheetCopy(props.phase);
  const busy =
    props.phase === "requestingPermission" ||
    props.phase === "findingLatest" ||
    props.phase === "importingRecent" ||
    props.phase === "importingEarlier";
  const historyLabel =
    props.historyStatusLabel ??
    (props.phase === "historyIncomplete"
      ? "Incomplete"
      : props.phase === "upToDate" || props.phase === "connectedStatus"
        ? "Up to date"
        : props.phase === "connectedNoData"
          ? "No data yet"
          : props.phase === "importingRecent" || props.phase === "importingEarlier"
            ? "Importing"
            : null);

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
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} accessibilityElementsHidden />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <BodyAppleHealthSourceIcon color={BODY_INDIGO} size={20} decorative />
                <View style={styles.headerText}>
                  {copy.eyebrow ? <Text style={styles.eyebrow}>{copy.eyebrow}</Text> : null}
                  <Text
                    style={styles.title}
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                  >
                    {copy.title}
                  </Text>
                </View>
              </View>
              {copy.statusChip ? (
                <View
                  style={styles.statusChip}
                  testID="body-ah-sheet-status-chip"
                  accessibilityLabel={`Status ${copy.statusChip}`}
                >
                  <Text style={styles.statusChipText}>{copy.statusChip}</Text>
                </View>
              ) : null}
            </View>

            {copy.body ? <Text style={styles.body}>{copy.body}</Text> : null}

            {copy.showMetricList ? (
              <View style={styles.metricCard} accessibilityRole="list">
                {BODY_APPLE_HEALTH_CONNECT_METRICS.map((metric) => (
                  <View key={metric} style={styles.metricRow}>
                    <Text style={styles.metricText}>{metric}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {copy.showMetricStatusRows ? (
              <View style={styles.metricCard} testID="body-ah-sheet-status-rows">
                <View style={styles.statusRow}>
                  <Text style={styles.statusRowLabel}>Latest measurements</Text>
                  <Text style={styles.statusRowValue}>
                    {props.phase === "connectedNoData" ? "None found" : "Available"}
                  </Text>
                </View>
                <View style={styles.statusRowDivider} />
                <View style={styles.statusRow}>
                  <Text style={styles.statusRowLabel}>Body history</Text>
                  <Text
                    style={[
                      styles.statusRowValue,
                      historyLabel === "Incomplete" && styles.statusRowCaution,
                    ]}
                  >
                    {historyLabel ?? "—"}
                  </Text>
                </View>
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

            {(copy.showSyncLatest || copy.showReviewAccess || copy.showManageInSettings) && (
              <View style={styles.secondaryGroup}>
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
                    <Text style={styles.linkText}>Manage Apple Health</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(52, 211, 153, 0.14)",
  },
  statusChipText: {
    color: UI_DURATION_STATUS_RECOMMENDED_TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
  },
  metricCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    backgroundColor: "rgba(0,0,0,0.22)",
    overflow: "hidden",
  },
  metricRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  metricText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  statusRow: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusRowLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "500",
  },
  statusRowValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  statusRowCaution: {
    color: "#F5C26B",
  },
  progressBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
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
  secondaryGroup: {
    gap: 2,
    marginTop: 2,
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
    borderRadius: 14,
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
    marginTop: 2,
  },
  secondaryLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
});
