import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ModuleScreenShell } from "@/lib/ui/ModuleScreenShell";
import {
  UI_BORDER_SUBTLE,
  UI_PANEL_SURFACE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

export type HealthRecordPlaceholderScreenProps = {
  /**
   * Nav / accessibility title. Not rendered in-page — the fixed stack header owns page identity.
   * Kept so callers and tests share one contract.
   */
  title: string;
  /** Supporting explanation shown inside the empty-state card (not as a page subtitle). */
  emptyDescription: string;
  emptyTitle?: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  actionLabel: string;
  /** When omitted or `disabled`, the action shows as coming soon. */
  onActionPress?: () => void;
  actionDisabled?: boolean;
  actionAccessibilityHint?: string;
  testID?: string;
};

/**
 * Shared empty-state shell for Health record destinations that are not implemented yet
 * (Medical History, Scans, Medication, Supplements, DNA).
 *
 * Renders one card under the fixed stack header — no duplicate page title chrome.
 */
export function HealthRecordPlaceholderScreen({
  title,
  emptyDescription,
  emptyTitle = "Not set up yet",
  icon,
  actionLabel,
  onActionPress,
  actionDisabled = true,
  actionAccessibilityHint = "Coming soon",
  testID,
}: HealthRecordPlaceholderScreenProps) {
  const disabled = actionDisabled || onActionPress == null;

  return (
    <ModuleScreenShell title={title} hideTitleChrome>
      <View
        style={styles.card}
        testID={testID ?? "health-record-placeholder"}
        accessibilityLabel={`${title}. ${emptyTitle}. ${emptyDescription}`}
      >
        <View style={styles.iconWrap} accessibilityElementsHidden>
          <Ionicons name={icon} size={36} color={UI_TEXT_PRIMARY} />
        </View>
        <Text style={styles.emptyTitle} testID="health-record-placeholder-empty-title">
          {emptyTitle}
        </Text>
        <Text style={styles.emptyDescription} testID="health-record-placeholder-empty-description">
          {emptyDescription}
        </Text>
        <Pressable
          testID="health-record-placeholder-action"
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityHint={disabled ? actionAccessibilityHint : undefined}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => {
            if (!disabled) onActionPress?.();
          }}
          style={({ pressed }) => [
            styles.action,
            disabled && styles.actionDisabled,
            pressed && !disabled && styles.actionPressed,
          ]}
        >
          <Text style={[styles.actionLabel, disabled && styles.actionLabelDisabled]}>
            {actionLabel}
          </Text>
          {disabled ? <Text style={styles.comingSoon}>Coming soon</Text> : null}
        </Pressable>
      </View>
    </ModuleScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: UI_PANEL_SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_SUBTLE,
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: UI_TEXT_SECONDARY,
    textAlign: "center",
    maxWidth: 320,
  },
  action: {
    marginTop: 14,
    minHeight: 44,
    minWidth: 180,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  actionDisabled: {
    opacity: 0.72,
  },
  actionPressed: {
    opacity: 0.88,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  actionLabelDisabled: {
    color: UI_TEXT_PRIMARY,
  },
  comingSoon: {
    fontSize: 12,
    fontWeight: "500",
    color: UI_TEXT_TERTIARY_LABEL,
  },
});
