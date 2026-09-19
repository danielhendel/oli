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
  formatAppleHealthLastUpdatedLabel,
  resolveBodyHistoryStatusLabel,
  type AppleHealthBodyConnectSheetPhase,
} from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";
import { AppleHealthScopeIndicator } from "@/lib/ui/body/AppleHealthScopeIndicator";
import {
  BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
  BodyAppleHealthSourceIcon,
} from "@/lib/ui/body/BodyAppleHealthSourceIcon";
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

/** Canonical in-app Apple Health access summary. */
export const BODY_APPLE_HEALTH_SETTINGS_HREF = "/(app)/settings/devices/apple_health";

export type BodyAppleHealthConnectSheetProps = {
  visible: boolean;
  phase: AppleHealthBodyConnectSheetPhase;
  onClose: () => void;
  onPrimary: () => void;
  lastSuccessfulSyncAtIso?: string | null;
  historyAttention?: boolean;
  /** Body domain connected for current account — drives noninteractive ON indicators. */
  bodyScopeConnected?: boolean;
  onReviewAccess?: () => void;
  onOpenAppleHealthSettings?: () => void;
};

/**
 * Premium Body Composition Apple Health status sheet — Category Card visual language.
 * Status/management only: no latest refresh on open.
 */
export function BodyAppleHealthConnectSheet(props: BodyAppleHealthConnectSheetProps) {
  const insets = useSafeAreaInsets();
  const copy = buildAppleHealthBodyConnectSheetCopy(props.phase);
  const busy =
    props.phase === "requestingPermission" ||
    props.phase === "findingLatest" ||
    props.phase === "importingRecent" ||
    props.phase === "importingEarlier";
  const historyLabel = resolveBodyHistoryStatusLabel(
    props.phase,
    props.historyAttention === true,
  );
  const lastUpdated = formatAppleHealthLastUpdatedLabel(
    props.lastSuccessfulSyncAtIso ?? null,
  );
  const scopeOn = props.bodyScopeConnected === true;

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
            <View style={styles.headerRow} testID="body-ah-sheet-header">
              <View style={styles.headerLeft}>
                <View style={styles.sourceTitleRow} testID="body-ah-sheet-source-title-row">
                  <BodyAppleHealthSourceIcon accent="strong" size={20} decorative />
                  {copy.eyebrow ? (
                    <Text style={styles.sourceTitle} accessibilityRole="header">
                      {copy.eyebrow}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.contextTitle}>{copy.title}</Text>
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
                {BODY_APPLE_HEALTH_CONNECT_METRICS.map((metric, index) => (
                  <View
                    key={metric}
                    style={[
                      styles.metricRow,
                      index < BODY_APPLE_HEALTH_CONNECT_METRICS.length - 1
                        ? styles.metricRowBorder
                        : null,
                    ]}
                  >
                    <Text style={styles.metricText}>{metric}</Text>
                    {copy.showScopeIndicators ? (
                      <AppleHealthScopeIndicator
                        metricLabel={metric}
                        on={scopeOn}
                        testID={`body-ah-sheet-scope-${metric.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {copy.showStatusRows ? (
              <View style={styles.metricCard} testID="body-ah-sheet-status-rows">
                <View style={styles.statusRow}>
                  <Text style={styles.statusRowLabel}>Last updated</Text>
                  <Text
                    style={styles.statusRowValue}
                    accessibilityLabel={`Last updated ${lastUpdated}`}
                    testID="body-ah-sheet-last-updated"
                  >
                    {lastUpdated}
                  </Text>
                </View>
                <View style={styles.statusRowDivider} />
                <View style={styles.statusRow}>
                  <Text style={styles.statusRowLabel}>Body history</Text>
                  <Text
                    style={[
                      styles.statusRowValue,
                      historyLabel === "Incomplete" || historyLabel === "Paused"
                        ? styles.statusRowCaution
                        : null,
                    ]}
                    testID="body-ah-sheet-history-status"
                  >
                    {historyLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            {copy.showSettingsLink && props.onOpenAppleHealthSettings ? (
              <Pressable
                style={styles.settingsRow}
                onPress={props.onOpenAppleHealthSettings}
                accessibilityRole="button"
                accessibilityLabel="Apple Health settings"
                accessibilityHint="Opens Apple Health access summary in Oli"
                testID="body-ah-sheet-settings-link"
              >
                <Text style={styles.settingsLabel}>Apple Health settings</Text>
                <Text style={styles.settingsChevron} accessibilityElementsHidden>
                  ›
                </Text>
              </Pressable>
            ) : null}

            {copy.progressLabel ? (
              <View
                style={styles.progressBlock}
                accessibilityLiveRegion="polite"
                accessibilityLabel={copy.progressLabel}
              >
                {busy ? (
                  <ActivityIndicator color={BODY_APPLE_HEALTH_ICON_COLOR_STRONG} />
                ) : null}
                <Text style={styles.progressText}>{copy.progressLabel}</Text>
              </View>
            ) : null}

            {copy.footer ? <Text style={styles.footer}>{copy.footer}</Text> : null}

            {copy.showReviewAccess && props.onReviewAccess ? (
              <Pressable
                style={styles.reviewBtn}
                onPress={props.onReviewAccess}
                accessibilityRole="button"
                accessibilityLabel="Review Apple Health access"
                testID="body-ah-sheet-review-access"
              >
                <Text style={styles.reviewBtnText}>Review access</Text>
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
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  sourceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  contextTitle: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
    paddingLeft: 28,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(52, 211, 153, 0.14)",
    minHeight: 28,
    justifyContent: "center",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  metricRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_CARD_ELEVATED_BORDER,
  },
  metricText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  statusRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_CARD_ELEVATED_BORDER,
  },
  statusRowLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  statusRowValue: {
    color: UI_TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  statusRowCaution: {
    color: "#F5C26B",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingVertical: 4,
  },
  settingsLabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },
  settingsChevron: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 20,
    fontWeight: "300",
  },
  progressBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
  },
  progressText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 15,
    flex: 1,
  },
  footer: {
    color: UI_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  reviewBtn: {
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewBtnText: {
    color: BODY_APPLE_HEALTH_ICON_COLOR_STRONG,
    fontSize: 15,
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
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    marginTop: 4,
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
